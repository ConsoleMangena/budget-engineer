from __future__ import annotations

import os
import io
import json
import uuid
import base64
import logging
import requests as http_requests
from django.conf import settings
from django.db.models import Avg, Q
from django.http import StreamingHttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from .models import (
    AIInstruction, ChatSession, ChatMessage,
    DrawingStylePreset, ImageFeedback, MaterialPrice, TokenUsage,
    BOQTemplate, SiteIntel,
)
from apps.builder_dashboard.models import Project, BudgetAnalysisHistory
from .mcp_manager import sync_get_mcp_tools, sync_execute_mcp_tool

logger = logging.getLogger(__name__)


# ── Pydantic schemas ─────────────────────────────────────────────────

class BOQBuildingItem(BaseModel):
    bill_no: str = Field(description="e.g. 1, 1.1, 2.A")
    description: str = Field(description="Detailed description of the item")
    specification: Optional[str] = Field(
        default=None,
        description="Trade/element or specification notes (e.g. Substructure, RC grade, measurement basis)",
    )
    unit: str = Field(description="m² / m³ / m / nr / item")
    quantity: float = Field(description="Measured quantity")
    rate: float = Field(description="Unit rate in local currency, estimate if unknown")

class BOQProfessionalFee(BaseModel):
    discipline: str = Field(description="e.g. Architect, Engineer")
    role_scope: str = Field(description="Description of services")
    basis: str = Field(description="Basis of fee calculation")
    rate: str = Field(description="e.g. '5%' or 'Fixed'")
    estimated_fee: float = Field(description="Calculated fee")

class BOQAdminExpense(BaseModel):
    item_role: str = Field(description="e.g. Project Manager")
    description: str = Field(description="Details")
    trips_per_week: Optional[float] = Field(default=None)
    total_trips: Optional[float] = Field(default=None)
    distance: Optional[float] = Field(default=None)
    rate: float = Field(default=0)
    total_cost: float = Field(default=0)

class BOQLabourCost(BaseModel):
    phase: str = Field(description="e.g. Substructure")
    trade_role: str = Field(description="e.g. Bricklayer")
    skill_level: str = Field(description="e.g. Skilled")
    gang_size: float = Field(default=0)
    duration_weeks: float = Field(default=0)
    total_man_days: float = Field(default=0)
    daily_rate: float = Field(default=0)
    total_cost: float = Field(default=0)
    weekly_wage_bill: Optional[float] = Field(default=None)

class BOQMachinePlant(BaseModel):
    category: str = Field(description="e.g. Earthmoving")
    machine_item: str = Field(description="e.g. TLB")
    qty: float = Field(default=1)
    dry_hire_rate: Optional[float] = Field(default=None)
    fuel_l_hr: Optional[float] = Field(default=None)
    hrs_day: Optional[float] = Field(default=None)
    fuel_cost: Optional[float] = Field(default=None)
    operator_rate: Optional[str] = Field(default=None)
    daily_wet_rate: float = Field(default=0)
    days_rqd: float = Field(default=0)
    total_cost: float = Field(default=0)

class BOQLabourBreakdown(BaseModel):
    phase: str = Field(description="e.g. Superstructure")
    trade_role: str = Field(description="e.g. Carpenter")
    skill_level: str = Field(description="e.g. Semi-skilled")
    gang_size: float = Field(default=0)
    duration_weeks: float = Field(default=0)
    total_man_days: float = Field(default=0)
    daily_rate: float = Field(default=0)
    total_cost: float = Field(default=0)

class BOQScheduleTask(BaseModel):
    wbs: str = Field(description="Work Breakdown Structure ID")
    task_description: str = Field(description="Name of the task")
    start_date: str = Field(description="YYYY-MM-DD")
    end_date: str = Field(description="YYYY-MM-DD")
    days: str = Field(description="Duration in days")
    predecessor: Optional[str] = Field(default=None)
    est_cost: float = Field(default=0)

class BOQScheduleMaterial(BaseModel):
    section: str = Field(description="e.g. SUBSTRUCTURE, SUPERSTRUCTURE, ROOFING_CEILINGS, FINISHES, DOORS_WINDOWS, PLUMBING, ELECTRICAL_SOLAR")
    material_description: str = Field(description="Description of the material")
    specification: Optional[str] = Field(default=None, description="Detailed specification")
    estimated_qty: Optional[str] = Field(default=None, description="Estimated quantity as text, e.g. '50 bags'")

class BOQAnalysis(BaseModel):
    """Structured BOQ analysis result from Gemini vision."""
    summary: str = Field(description="Brief overall description of the project budget")
    building_items: List[BOQBuildingItem] = Field(default_factory=list, description="Bill of Quantities items")
    professional_fees: List[BOQProfessionalFee] = Field(default_factory=list, description="Professional fees")
    admin_expenses: List[BOQAdminExpense] = Field(default_factory=list, description="Admin and expenses")
    labour_costs: List[BOQLabourCost] = Field(default_factory=list, description="Labor costs by phase")
    machine_plants: List[BOQMachinePlant] = Field(default_factory=list, description="Machinery and plant costs")
    labour_breakdowns: List[BOQLabourBreakdown] = Field(default_factory=list, description="Detailed labor breakdown")
    schedule_tasks: List[BOQScheduleTask] = Field(default_factory=list, description="Project schedule timeline")
    schedule_materials: List[BOQScheduleMaterial] = Field(default_factory=list, description="Schedule of materials list")
    compliance_notes: List[str] = Field(default_factory=list, description="Any SI-56 or regulatory observations")
    recommendations: List[str] = Field(default_factory=list, description="Suggested next steps for the builder")


# ── Tool definitions for Gemini function-calling ─────────────────────

def _get_material_prices(material: str, region: str = "Zimbabwe") -> dict:
    """Look up current material prices for a given region."""
    key = material.lower().strip()
    db_results = MaterialPrice.objects.filter(
        material__icontains=key,
        region__icontains=region,
    ).order_by('-updated_at')[:5]

    if db_results.exists():
        prices = [
            {
                "material": p.material,
                "unit": p.unit,
                "price": float(p.price),
                "currency": p.currency,
                "region": p.region,
                "supplier": p.supplier_name or "—",
                "updated": p.updated_at.isoformat() if p.updated_at else "",
            }
            for p in db_results
        ]
        return {"material": key, "region": region, "found": True, "prices": prices}

    _PRICE_DB = {
        "cement": {"unit": "50kg bag", "price": 12.50, "currency": "USD"},
        "river sand": {"unit": "m³", "price": 35.00, "currency": "USD"},
        "pit sand": {"unit": "m³", "price": 25.00, "currency": "USD"},
        "common bricks": {"unit": "1000 nr", "price": 85.00, "currency": "USD"},
        "face bricks": {"unit": "1000 nr", "price": 150.00, "currency": "USD"},
        "reinforcement steel": {"unit": "tonne", "price": 950.00, "currency": "USD"},
        "roofing sheets": {"unit": "sheet (0.6×3.6m)", "price": 18.00, "currency": "USD"},
        "timber (meranti)": {"unit": "m³", "price": 600.00, "currency": "USD"},
        "pvc pipes 110mm": {"unit": "6m length", "price": 22.00, "currency": "USD"},
        "ready-mix concrete c25": {"unit": "m³", "price": 120.00, "currency": "USD"},
    }
    for name, info in _PRICE_DB.items():
        if key in name or name in key:
            return {"material": name, "region": region, **info, "found": True, "source": "static_fallback"}
    return {"material": material, "region": region, "found": False,
            "message": f"Price for '{material}' not found. Ask the user for a manual quote."}


def _check_compliance(building_type: str, aspect: str) -> dict:
    """Check SI-56 / Zimbabwe building regulation compliance for a given aspect."""
    _RULES = {
        "minimum_room_sizes": {
            "bedroom": "9 m² minimum (SI-56 §4.3)",
            "kitchen": "5.5 m² minimum (SI-56 §4.4)",
            "bathroom": "2.5 m² minimum (SI-56 §4.5)",
            "living_room": "12 m² minimum (SI-56 §4.2)",
            "corridor_width": "900 mm minimum (SI-56 §4.7)",
        },
        "structural": {
            "foundation_depth": "Minimum 600 mm below natural ground level (SI-56 §3.2)",
            "wall_thickness": "Minimum 230 mm for load-bearing external walls (SI-56 §5.1)",
            "ceiling_height": "Minimum 2.4 m floor to ceiling (SI-56 §4.1)",
            "damp_proof_course": "DPC required at 150 mm above finished ground level (SI-56 §3.5)",
        },
        "fire_safety": {
            "escape_routes": "Every habitable room must have a window ≥ 0.5 m² (SI-56 §7.2)",
            "fire_walls": "Fire walls between units — 230 mm solid masonry (SI-56 §7.4)",
        },
    }
    aspect_lower = aspect.lower()
    results = []
    for category, rules in _RULES.items():
        for rule_key, rule_text in rules.items():
            if aspect_lower in rule_key or rule_key in aspect_lower or aspect_lower in category:
                results.append({"category": category, "rule": rule_key, "detail": rule_text})
    if results:
        return {"building_type": building_type, "aspect": aspect, "rules": results, "found": True}
    return {"building_type": building_type, "aspect": aspect, "found": False,
            "message": f"No specific rule found for '{aspect}'. General SI-56 guidelines apply."}


def _calculate_area(shape: str, dimensions: dict) -> dict:
    """Calculate area / volume for common construction shapes."""
    import math
    shape_lower = shape.lower()
    if shape_lower == "rectangle":
        length = dimensions.get("length", 0)
        width = dimensions.get("width", 0)
        return {"shape": shape, "area_m2": round(length * width, 2), "dimensions": dimensions}
    elif shape_lower == "circle":
        radius = dimensions.get("radius", 0)
        return {"shape": shape, "area_m2": round(math.pi * radius ** 2, 2), "dimensions": dimensions}
    elif shape_lower == "triangle":
        base = dimensions.get("base", 0)
        height = dimensions.get("height", 0)
        return {"shape": shape, "area_m2": round(0.5 * base * height, 2), "dimensions": dimensions}
    elif shape_lower in ("cuboid", "volume"):
        length = dimensions.get("length", 0)
        width = dimensions.get("width", 0)
        height = dimensions.get("height", 0)
        return {"shape": shape, "volume_m3": round(length * width * height, 2), "dimensions": dimensions}
    return {"shape": shape, "error": f"Unknown shape '{shape}'. Supported: rectangle, circle, triangle, cuboid."}


# Map tool names to callables
_TOOL_MAP = {
    "get_material_prices": _get_material_prices,
    "check_compliance": _check_compliance,
    "calculate_area": _calculate_area,
}

# Shared tool definitions for Gemini function-calling (used by both sync and streaming)
_TOOL_DEFINITIONS = [
    {
        "name": "get_material_prices",
        "description": "Look up current construction material prices for a region. Use when the user asks about costs, pricing, or material rates.",
        "input_schema": {
            "type": "object",
            "properties": {
                "material": {"type": "string", "description": "Name of the construction material, e.g. 'cement', 'face bricks', 'reinforcement steel'"},
                "region": {"type": "string", "description": "Region/country, defaults to Zimbabwe", "default": "Zimbabwe"},
            },
            "required": ["material"],
        },
    },
    {
        "name": "check_compliance",
        "description": "Check SI-56 / Zimbabwe building regulation compliance for a given building aspect. Use when the user asks about building codes, regulations, minimum sizes, or compliance.",
        "input_schema": {
            "type": "object",
            "properties": {
                "building_type": {"type": "string", "description": "Type of building, e.g. 'residential', 'commercial'"},
                "aspect": {"type": "string", "description": "The aspect to check, e.g. 'bedroom', 'foundation_depth', 'ceiling_height', 'fire_safety'"},
            },
            "required": ["building_type", "aspect"],
        },
    },
    {
        "name": "calculate_area",
        "description": "Calculate area or volume for construction shapes. Use when the user asks to compute areas, perimeters, or volumes.",
        "input_schema": {
            "type": "object",
            "properties": {
                "shape": {"type": "string", "description": "Shape type: rectangle, circle, triangle, or cuboid"},
                "dimensions": {
                    "type": "object",
                    "description": "Dimension values. For rectangle: length, width. Circle: radius. Triangle: base, height. Cuboid: length, width, height.",
                },
            },
            "required": ["shape", "dimensions"],
        },
    },
]

# ── Command detection ────────────────────────────────────────────────

_DRAW_KEYWORDS = ['/draw']
_PLANS_KEYWORDS = ['/plans']
_ANALYSE_KEYWORDS = ['/analyse', '/analyze']
_SCAN_KEYWORDS = ['/scan']


def _is_drawing_request(text: str) -> bool:
    """Return True when the user's message looks like a drawing request."""
    lower = text.lower()
    return any(kw in lower for kw in _DRAW_KEYWORDS)


def _is_floor_plan_search(text: str) -> bool:
    """Return True when the user's message is a floor plan search request."""
    lower = text.lower()
    return any(kw in lower for kw in _PLANS_KEYWORDS)


def _is_analyse_request(text: str) -> bool:
    """Return True when the user wants AI-powered BOQ / floor plan analysis."""
    lower = text.lower()
    return any(kw in lower for kw in _ANALYSE_KEYWORDS)


def _is_scan_request(text: str) -> bool:
    """Return True when the user wants to scan a hand-drawn plan and generate a professional drawing."""
    lower = text.lower()
    return any(kw in lower for kw in _SCAN_KEYWORDS)


def _extract_search_terms(text: str) -> str:
    """Strip the /plans command and return the remaining search terms."""
    lower = text.strip()
    for kw in _PLANS_KEYWORDS:
        if lower.lower().startswith(kw):
            return lower[len(kw):].strip()
    return lower


def _extract_scan_description(text: str) -> str:
    """Strip the /scan command and return any extra user description."""
    stripped = text.strip()
    for kw in _SCAN_KEYWORDS:
        if stripped.lower().startswith(kw):
            return stripped[len(kw):].strip()
    return stripped


def _to_bool(value, default: bool = False) -> bool:
    """Normalize booleans from JSON/form payloads."""
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y", "on"}
    return bool(value)


# ── Site intelligence helpers ──────────────────────────────────────

_SITE_INTEL_KEYWORDS = ['site intel', 'site intelligence', 'site analysis', 'site conditions']


def _is_site_intel_request(text: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in _SITE_INTEL_KEYWORDS)


def _build_site_intel_prompt(project: Project) -> str:
    lines = [
        f"Project: {project.title}",
        f"Location: {project.location}",
    ]
    if project.latitude and project.longitude:
        lines.append(f"Coordinates: {project.latitude}, {project.longitude}")
    if project.ai_brief:
        lines.append(f"Brief: {project.ai_brief}")
    if project.site_notes:
        lines.append(f"Site notes: {project.site_notes}")
    if project.constraints:
        lines.append(f"Constraints: {project.constraints}")

    # Latest Site Updates for context
    updates = project.site_updates.all()[:3]
    if updates.exists():
        lines.append("\nRecent Site Updates:")
        for u in updates:
            geo = f" (Geo: {u.geo_location})" if u.geo_location else ""
            lines.append(f"- {u.description}{geo}")

    lines.append(
        "\nGenerate concise site intelligence in JSON only: { 'summary': string, "
        "'insights': [{ 'aspect': string, 'finding': string, 'risk': string, 'recommendation': string }] }."
    )
    lines.append("No markdown or tables. Use the location, coordinates, and site notes to research local zoning, regulations, and neighborhood facts.")
    return "\n".join(lines)


def _parse_site_intel_response(raw_text: str) -> dict:
    """Best-effort parse of Gemini JSON for site intel."""
    try:
        return json.loads(raw_text)
    except Exception:
        pass
    # Try to extract JSON substring
    try:
        start = raw_text.find('{')
        end = raw_text.rfind('}')
        if start != -1 and end != -1 and end > start:
            return json.loads(raw_text[start:end+1])
    except Exception:
        return {}



def _search_floor_plans(query: str, limit: int = 6) -> list:
    """
    Search FloorPlanDataset by title, description, and category name.
    Returns a list of dicts with plan details and image URLs.
    """
    from apps.admin_dashboard.models import FloorPlanDataset

    if not query:
        # No search terms — return the latest plans
        plans = FloorPlanDataset.objects.select_related('category').order_by('-created_at')[:limit]
    else:
        terms = query.split()
        q_filter = Q()
        for term in terms:
            q_filter |= (
                Q(title__icontains=term) |
                Q(description__icontains=term) |
                Q(category__name__icontains=term)
            )
        plans = FloorPlanDataset.objects.select_related('category').filter(q_filter).distinct().order_by('-created_at')[:limit]

    results = []
    for plan in plans:
        image_url = None
        if plan.image:
            try:
                image_url = plan.image.url
            except Exception:
                pass
        results.append({
            'id': plan.id,
            'title': plan.title,
            'description': plan.description or '',
            'category_name': plan.category.name if plan.category else 'Uncategorized',
            'image_url': image_url,
            'created_at': plan.created_at.isoformat() if plan.created_at else None,
        })
    return results


def _match_style_preset(text: str):
    """
    Find the best-matching active DrawingStylePreset for the user's query.
    Returns the preset or None.
    """
    lower = text.lower()
    presets = DrawingStylePreset.objects.filter(is_active=True).order_by('-priority')
    for preset in presets:
        if any(kw in lower for kw in preset.get_keywords_list()):
            return preset
    return None


def _get_top_rated_prompts(preset, limit=3):
    """
    Fetch the highest-rated prompts from ImageFeedback for a given preset.
    These serve as few-shot examples for Gemini's prompt engineering.
    """
    if not preset:
        feedback = ImageFeedback.objects.filter(
            rating__gte=4
        ).order_by('-rating', '-created_at')[:limit]
    else:
        feedback = ImageFeedback.objects.filter(
            preset_used=preset, rating__gte=4
        ).order_by('-rating', '-created_at')[:limit]

    return [f.original_prompt for f in feedback]


# ── Image generation ─────────────────────────────────────────────────

def _generate_image_from_gemini(prompt: str, negative_prompt: str = "", guidance_scale: float = 7.5, model_override: str | None = None) -> tuple[str | None, str | None]:
    """Returns (image_url, error_message). One will always be None."""
    from PIL import Image

    api_key = settings.GEMINI_API_KEY
    if not api_key or 'your-' in api_key.lower() or len(api_key) < 10:
        logger.error("GEMINI_API_KEY is not configured or is a placeholder.")
        return None, (
            "⚠️ Image generation is not configured. The Gemini API key is missing or invalid. "
            "Please ask the admin to set a valid GEMINI_API_KEY in the environment."
        )

    model_name = model_override or settings.GEMINI_IMAGE_MODEL
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

    enhanced_prompt = prompt
    if negative_prompt:
        enhanced_prompt += f" (Do NOT include: {negative_prompt})"

    payload = {
        "contents": [{
            "parts": [{"text": enhanced_prompt}]
        }],
        "generationConfig": {
            "responseModalities": ["Text", "Image"],
            "temperature": 1.0,
            "topP": 0.95,
            "topK": 40,
        },
    }

    try:
        logger.info("[Gemini Image] Calling %s with prompt: %.120s…", model_name, enhanced_prompt)
        response = http_requests.post(url, json=payload, timeout=90.0)

        if response.status_code != 200:
            body = response.text[:500]
            logger.error("Gemini Image API HTTP %s: %s", response.status_code, body)
            return None, (
                f"⚠️ Image generation failed (HTTP {response.status_code}). "
                "The Gemini API returned an error. Please try again or contact support."
            )

        data = response.json()

        if data.get("promptFeedback", {}).get("blockReason"):
            reason = data["promptFeedback"]["blockReason"]
            logger.warning("Gemini Image blocked: %s", reason)
            return None, (
                f"⚠️ Image generation was blocked by safety filters ({reason}). "
                "Please rephrase your request and try again."
            )

        candidates = data.get("candidates", [])
        if not candidates:
            logger.warning("No candidates returned from Gemini Image API. Response: %s", str(data)[:300])
            return None, "⚠️ The image model returned no results. Please try rephrasing your request."

        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            logger.warning("No parts in the first candidate.")
            return None, "⚠️ The image model returned an empty response. Please try again."

        # The response may contain multiple parts: text part(s) and image part(s).
        # Iterate all parts to find the inlineData (image).
        b64_data = None
        mime_type = "image/png"
        for part in parts:
            inline_data = part.get("inlineData", {})
            if inline_data.get("data"):
                b64_data = inline_data["data"]
                mime_type = inline_data.get("mimeType", "image/png")
                break

        if not b64_data:
            # The model returned text only — no image was generated
            text_content = " ".join(p.get("text", "") for p in parts if "text" in p)
            logger.warning("Gemini returned text-only (no image). Text: %.200s", text_content)
            return None, (
                "⚠️ The image model did not generate an image for this request. "
                "It may have been too complex or filtered. Please try a simpler description."
            )

        # Decode the image
        img_bytes = base64.b64decode(b64_data)
        image = Image.open(io.BytesIO(img_bytes))

        media_dir = os.path.join(settings.MEDIA_ROOT, 'ai_generated')
        os.makedirs(media_dir, exist_ok=True)
        ext = "png" if "png" in mime_type else "jpeg"
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(media_dir, filename)

        image.save(filepath, format=ext.upper())
        logger.info("[Gemini Image] Saved generated image: %s", filepath)

        return f"{settings.MEDIA_URL}ai_generated/{filename}", None

    except http_requests.exceptions.Timeout:
        logger.error("Gemini Image API timed out after 90s")
        return None, "⚠️ Image generation timed out. The request was too complex — please try a simpler description."
    except Exception as e:
        logger.error("Image generation error: %s", e)
        return None, f"⚠️ Image generation failed: {e}"


# ── Gemini AI helpers ────────────────────────────────────────────────

def _get_gemini_chat_model() -> str:
    """Return the Gemini model name used for general chat / tool calls."""
    return (getattr(settings, "GEMINI_CHAT_MODEL", "") or "gemini-2.5-flash").strip()


def _call_gemini(messages: list, system: str = "", max_tokens: int = 8192,
                 temperature: float = 0.7, images: list | None = None,
                 timeout: float = 120.0) -> str:
    """Call Gemini for chat/text completion. Returns assistant text."""
    api_key = settings.GEMINI_API_KEY
    if not api_key or len(api_key) < 10:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    model_name = _get_gemini_chat_model()
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}"
        f":generateContent?key={api_key}"
    )

    contents = []
    full_system = system.strip()

    for i, m in enumerate(messages):
        role = "user" if m.get("role", "user") == "user" else "model"
        parts: list[dict] = []

        if i == 0 and full_system:
            parts.append({"text": f"{full_system}\n\n{m.get('content', '')}"})
        else:
            parts.append({"text": m.get("content", "")})

        if i == len(messages) - 1 and role == "user" and images:
            for img_data in images:
                if img_data.startswith("data:"):
                    media_type = img_data.split(";")[0].split(":")[1]
                    b64 = img_data.split(",", 1)[1]
                else:
                    media_type = "image/png"
                    b64 = img_data
                parts.append({"inlineData": {"mimeType": media_type, "data": b64}})

        contents.append({"role": role, "parts": parts})

    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
        },
    }

    logger.info("[Gemini Chat] Calling %s", model_name)
    try:
        resp = http_requests.post(url, json=payload, timeout=timeout)
    except http_requests.exceptions.Timeout:
        logger.error("Gemini Chat API timed out after %s seconds", timeout)
        raise RuntimeError("The AI request timed out. Please try a simpler request or try again later.")
    except http_requests.exceptions.RequestException as e:
        logger.error("Gemini Chat API connection error: %s", e)
        raise RuntimeError(f"Could not connect to AI service: {e}")

    if resp.status_code != 200:
        body = resp.text[:600]
        logger.error("Gemini Chat HTTP %s: %s", resp.status_code, body)
        raise RuntimeError(f"Gemini API error (HTTP {resp.status_code}): {body}")

    data = resp.json()
    candidates = data.get("candidates", [])
    if not candidates:
        raise RuntimeError("Gemini returned no candidates.")

    content_parts = candidates[0].get("content", {}).get("parts", [])
    text_parts = [p["text"] for p in content_parts if "text" in p]
    return "\n".join(text_parts)


def _repair_truncated_json(text: str) -> dict:
    """Attempt to salvage truncated JSON by progressively closing brackets/braces.
    """
    for trim in range(min(200, len(text))):
        candidate = text[:len(text) - trim] if trim else text
        # Try closing with various bracket combos
        for suffix in ["", "]}", "]}]}", '"]}'  , '"]}]}', '"}]}', "]", "}", '"}'  ]:
            try:
                return json.loads(candidate + suffix)
            except json.JSONDecodeError:
                continue
    raise ValueError("Could not repair truncated JSON from Gemini response.")


_GEMINI_UNSUPPORTED_SCHEMA_KEYS = {
    "$schema", "additionalProperties", "$id", "$ref", "$comment",
    "examples", "default", "title", "$defs", "definitions",
}


def _sanitize_schema_for_gemini(schema: dict) -> dict:
    """Strip JSON Schema fields the Gemini API rejects."""
    if not isinstance(schema, dict):
        return schema
    cleaned: dict = {}
    for k, v in schema.items():
        if k in _GEMINI_UNSUPPORTED_SCHEMA_KEYS:
            continue
        if isinstance(v, dict):
            cleaned[k] = _sanitize_schema_for_gemini(v)
        elif isinstance(v, list):
            cleaned[k] = [
                _sanitize_schema_for_gemini(item) if isinstance(item, dict) else item
                for item in v
            ]
        else:
            cleaned[k] = v
    return cleaned


def _call_gemini_with_tools(messages: list, system: str = "", max_tokens: int = 8192,
                            temperature: float = 0.7, images: list | None = None,
                            timeout: float = 120.0) -> str:
    """Call Gemini with function-calling. Loops until a final text response."""
    api_key = settings.GEMINI_API_KEY
    if not api_key or len(api_key) < 10:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    model_name = _get_gemini_chat_model()
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}"
        f":generateContent?key={api_key}"
    )

    mcp_tools = sync_get_mcp_tools()
    all_tool_defs = _TOOL_DEFINITIONS + mcp_tools

    gemini_tools = []
    for td in all_tool_defs:
        fn_decl = {
            "name": td["name"],
            "description": td.get("description", ""),
        }
        schema = td.get("input_schema")
        if schema:
            fn_decl["parameters"] = _sanitize_schema_for_gemini(schema)
        gemini_tools.append(fn_decl)

    tool_config = {"functionDeclarations": gemini_tools} if gemini_tools else None

    contents = []
    full_system = system.strip()

    for i, m in enumerate(messages):
        role = "user" if m.get("role", "user") == "user" else "model"
        parts: list[dict] = []
        if i == 0 and full_system:
            parts.append({"text": f"{full_system}\n\n{m.get('content', '')}"})
        else:
            parts.append({"text": m.get("content", "")})

        if i == len(messages) - 1 and role == "user" and images:
            for img_data in images:
                if img_data.startswith("data:"):
                    media_type = img_data.split(";")[0].split(":")[1]
                    b64 = img_data.split(",", 1)[1]
                else:
                    media_type = "image/png"
                    b64 = img_data
                parts.append({"inlineData": {"mimeType": media_type, "data": b64}})

        contents.append({"role": role, "parts": parts})

    for _round in range(5):
        payload: dict = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }
        if tool_config:
            payload["tools"] = [tool_config]

        try:
            resp = http_requests.post(url, json=payload, timeout=timeout)
        except http_requests.exceptions.Timeout:
            logger.error("Gemini Chat tools API timed out after %s seconds", timeout)
            raise RuntimeError("The AI request timed out. Please try a simpler request or try again later.")
        except http_requests.exceptions.RequestException as e:
            logger.error("Gemini Chat tools API connection error: %s", e)
            raise RuntimeError(f"Could not connect to AI service: {e}")

        if resp.status_code != 200:
            body = resp.text[:600]
            raise RuntimeError(f"Gemini API error (HTTP {resp.status_code}): {body}")

        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise RuntimeError("Gemini returned no candidates.")

        parts = candidates[0].get("content", {}).get("parts", [])

        fn_calls = [p for p in parts if "functionCall" in p]
        if not fn_calls:
            text_parts = [p.get("text", "") for p in parts if "text" in p]
            return "\n".join(text_parts)

        contents.append({"role": "model", "parts": parts})
        fn_response_parts = []
        for fc_part in fn_calls:
            fc = fc_part["functionCall"]
            fn_name = fc["name"]
            fn_args = fc.get("args", {})

            tool_fn = _TOOL_MAP.get(fn_name)
            if tool_fn:
                try:
                    result = tool_fn(**fn_args)
                except Exception as e:
                    result = {"error": str(e)}
            else:
                result = sync_execute_mcp_tool(fn_name, fn_args)

            fn_response_parts.append({
                "functionResponse": {
                    "name": fn_name,
                    "response": result if isinstance(result, dict) else {"result": str(result)},
                }
            })

        contents.append({"role": "user", "parts": fn_response_parts})

    text_parts = [p.get("text", "") for p in parts if "text" in p]
    return "\n".join(text_parts) if text_parts else "I was unable to complete the request."


def _get_analyse_model_name() -> str:
    """Resolve the Gemini model used by `/analyse`."""
    return (getattr(settings, "GEMINI_ANALYSE_MODEL", "") or "gemini-2.5-pro").strip()


def _call_gemini_analyse(system: str, user_content: str, images: list | None = None,
                         max_tokens: int = 16384, temperature: float = 0.3,
                         timeout: float = 180.0) -> str:
    """Call Gemini vision for /analyse. Returns raw text."""
    api_key = settings.GEMINI_API_KEY
    if not api_key or len(api_key) < 10:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    model_name = _get_analyse_model_name()
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}"
        f":generateContent?key={api_key}"
    )

    parts: list[dict] = [{"text": f"{system}\n\n{user_content}"}]

    if images:
        for img_data in images:
            if img_data.startswith("data:"):
                media_type = img_data.split(";")[0].split(":")[1]
                b64 = img_data.split(",", 1)[1]
            else:
                media_type = "image/png"
                b64 = img_data
            parts.append({"inlineData": {"mimeType": media_type, "data": b64}})

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
            "responseMimeType": "application/json",
        },
    }

    logger.info("[Analyse] Calling Gemini %s (max_tokens=%d)", model_name, max_tokens)
    try:
        resp = http_requests.post(url, json=payload, timeout=timeout)
    except http_requests.exceptions.Timeout:
        logger.error("Gemini Analyse API timed out after %s seconds", timeout)
        raise RuntimeError("The AI analysis timed out. The file might be too complex or large.")
    except http_requests.exceptions.RequestException as e:
        logger.error("Gemini Analyse API connection error: %s", e)
        raise RuntimeError(f"Could not connect to AI service: {e}")

    if resp.status_code != 200:
        body = resp.text[:600]
        logger.error("Gemini Analyse HTTP %s: %s", resp.status_code, body)
        raise RuntimeError(f"Gemini API error (HTTP {resp.status_code}): {body}")

    data = resp.json()
    candidates = data.get("candidates", [])
    if not candidates:
        raise RuntimeError("Gemini returned no candidates.")

    content_parts = candidates[0].get("content", {}).get("parts", [])
    text_parts = [p["text"] for p in content_parts if "text" in p]
    return "\n".join(text_parts)


def _coerce_float(value, default: float = 0.0) -> float:
    """Best-effort numeric coercion for AI payloads."""
    if value is None:
        return default
    try:
        if isinstance(value, str):
            cleaned = value.replace(",", "").replace("$", "").strip()
            return float(cleaned) if cleaned else default
        return float(value)
    except Exception:
        return default


def _normalize_analyse_payload(payload: dict) -> dict:
    """
    Normalize /analyse payload so frontend budget upload always works.

    Normalizes ALL 8 sections so field names/types match the Django models.
    """
    _empty = {
        "summary": "", "building_items": [], "professional_fees": [],
        "admin_expenses": [], "labour_costs": [], "machine_plants": [],
        "labour_breakdowns": [], "schedule_tasks": [], "schedule_materials": [],
        "compliance_notes": [], "recommendations": [],
    }
    if not isinstance(payload, dict):
        _empty["summary"] = "Analysis returned an invalid payload."
        return _empty

    def _safe_list(key, alt_key=None):
        v = payload.get(key)
        if isinstance(v, list):
            return v
        if alt_key:
            v2 = payload.get(alt_key)
            return v2 if isinstance(v2, list) else []
        return []

    # ── 1. Building Items ──
    raw_building = _safe_list("building_items", "items")
    building_items = []
    for idx, raw in enumerate(raw_building, start=1):
        if not isinstance(raw, dict):
            continue
        category = str(raw.get("category") or raw.get("trade_element") or "").strip()
        item_name = str(raw.get("item_name") or raw.get("name") or "").strip()
        description = str(raw.get("description") or "").strip()
        if not description:
            description = item_name or f"BOQ Item {idx}"
        if category and category.lower() not in description.lower():
            description = f"{category} - {description}"
        quantity = _coerce_float(raw.get("quantity"))
        rate = _coerce_float(raw.get("rate"))
        total_amount = _coerce_float(raw.get("total_amount"))
        if rate <= 0 and quantity > 0 and total_amount > 0:
            rate = total_amount / quantity
        building_items.append({
            "bill_no": str(raw.get("bill_no") or idx),
            "description": description,
            "specification": raw.get("specification") or raw.get("measurement_formula") or (f"Trade/Element: {category}" if category else None),
            "unit": str(raw.get("unit") or "item"),
            "quantity": quantity,
            "rate": rate,
        })

    # ── 2. Professional Fees ──
    prof_fees = []
    for raw in _safe_list("professional_fees"):
        if not isinstance(raw, dict):
            continue
        prof_fees.append({
            "discipline": str(raw.get("discipline") or "").strip(),
            "role_scope": str(raw.get("role_scope") or "").strip(),
            "basis": str(raw.get("basis") or "").strip(),
            "rate": str(raw.get("rate") or ""),
            "estimated_fee": _coerce_float(raw.get("estimated_fee")),
        })

    # ── 3. Admin Expenses ──
    admin_exp = []
    for raw in _safe_list("admin_expenses"):
        if not isinstance(raw, dict):
            continue
        admin_exp.append({
            "item_role": str(raw.get("item_role") or "").strip(),
            "description": str(raw.get("description") or "").strip(),
            "trips_per_week": _coerce_float(raw.get("trips_per_week")) or None,
            "total_trips": _coerce_float(raw.get("total_trips")) or None,
            "distance": _coerce_float(raw.get("distance")) or None,
            "rate": _coerce_float(raw.get("rate")),
            "total_cost": _coerce_float(raw.get("total_cost")),
        })

    # ── 4. Labour Costs ──
    labour_costs = []
    for raw in _safe_list("labour_costs"):
        if not isinstance(raw, dict):
            continue
        labour_costs.append({
            "phase": str(raw.get("phase") or "").strip(),
            "trade_role": str(raw.get("trade_role") or "").strip(),
            "skill_level": str(raw.get("skill_level") or "").strip(),
            "gang_size": _coerce_float(raw.get("gang_size")),
            "duration_weeks": _coerce_float(raw.get("duration_weeks")),
            "total_man_days": _coerce_float(raw.get("total_man_days")),
            "daily_rate": _coerce_float(raw.get("daily_rate")),
            "total_cost": _coerce_float(raw.get("total_cost")),
        })

    # ── 5. Machine & Plant ──
    machine_plants = []
    for raw in _safe_list("machine_plants"):
        if not isinstance(raw, dict):
            continue
        machine_plants.append({
            "category": str(raw.get("category") or "").strip(),
            "machine_item": str(raw.get("machine_item") or "").strip(),
            "qty": _coerce_float(raw.get("qty"), default=1),
            "dry_hire_rate": _coerce_float(raw.get("dry_hire_rate")) or None,
            "fuel_l_hr": _coerce_float(raw.get("fuel_l_hr")) or None,
            "hrs_day": _coerce_float(raw.get("hrs_day")) or None,
            "fuel_cost": _coerce_float(raw.get("fuel_cost")) or None,
            "operator_rate": str(raw.get("operator_rate") or "") or None,
            "daily_wet_rate": _coerce_float(raw.get("daily_wet_rate")),
            "days_rqd": _coerce_float(raw.get("days_rqd")),
            "total_cost": _coerce_float(raw.get("total_cost")),
        })

    # ── 6. Labour Breakdowns ──
    labour_breakdowns = []
    for raw in _safe_list("labour_breakdowns"):
        if not isinstance(raw, dict):
            continue
        labour_breakdowns.append({
            "phase": str(raw.get("phase") or "").strip(),
            "trade_role": str(raw.get("trade_role") or "").strip(),
            "skill_level": str(raw.get("skill_level") or "").strip(),
            "gang_size": _coerce_float(raw.get("gang_size")),
            "duration_weeks": _coerce_float(raw.get("duration_weeks")),
            "total_man_days": _coerce_float(raw.get("total_man_days")),
            "daily_rate": _coerce_float(raw.get("daily_rate")),
            "total_cost": _coerce_float(raw.get("total_cost")),
        })

    # ── 7. Schedule Tasks ──
    schedule_tasks = []
    for raw in _safe_list("schedule_tasks"):
        if not isinstance(raw, dict):
            continue
        schedule_tasks.append({
            "wbs": str(raw.get("wbs") or "").strip(),
            "task_description": str(raw.get("task_description") or "").strip(),
            "start_date": str(raw.get("start_date") or "").strip(),
            "end_date": str(raw.get("end_date") or "").strip(),
            "days": str(raw.get("days") or "").strip(),
            "predecessor": raw.get("predecessor") or None,
            "est_cost": _coerce_float(raw.get("est_cost")),
        })

    # ── 8. Schedule of Materials ──
    VALID_SECTIONS = {"SUBSTRUCTURE", "SUPERSTRUCTURE", "ROOFING_CEILINGS", "FINISHES", "DOORS_WINDOWS", "PLUMBING", "ELECTRICAL_SOLAR"}
    schedule_materials = []
    for raw in _safe_list("schedule_materials"):
        if not isinstance(raw, dict):
            continue
        section = str(raw.get("section") or "").strip().upper().replace(" ", "_").replace("&", "").replace("__", "_")
        if section not in VALID_SECTIONS:
            section = "SUBSTRUCTURE"
        est_qty = (
            raw.get("estimated_qty")
            or raw.get("estimated_quantity")
            or raw.get("quantity")
            or raw.get("qty")
            or ""
        )
        schedule_materials.append({
            "section": section,
            "material_description": str(raw.get("material_description") or raw.get("description") or raw.get("material") or "").strip(),
            "specification": str(raw.get("specification") or raw.get("spec") or "") or None,
            "estimated_qty": str(est_qty).strip() or None,
        })

    return {
        "summary": str(payload.get("summary") or "").strip(),
        "building_items": building_items,
        "professional_fees": prof_fees,
        "admin_expenses": admin_exp,
        "labour_costs": labour_costs,
        "machine_plants": machine_plants,
        "labour_breakdowns": labour_breakdowns,
        "schedule_tasks": schedule_tasks,
        "schedule_materials": schedule_materials,
        "compliance_notes": _safe_list("compliance_notes"),
        "recommendations": _safe_list("recommendations"),
    }


def _stream_gemini_with_tools(messages: list, system: str = "", max_tokens: int = 8192,
                              temperature: float = 0.7, images: list | None = None):
    """
    Gemini equivalent of streaming with tool-use.
    Gemini REST API does not support true SSE streaming in the same way,
    so we perform a full call and then yield the response in chunks
    to preserve the SSE contract with the frontend.
    """
    try:
        full_text = _call_gemini_with_tools(
            messages=messages, system=system,
            max_tokens=max_tokens, temperature=temperature,
            images=images,
        )
    except Exception as exc:
        yield f"data: {json.dumps({'type': 'error', 'content': str(exc)})}\n\n"
        yield "data: [DONE]\n\n"
        return

    CHUNK_SIZE = 80
    for i in range(0, len(full_text), CHUNK_SIZE):
        yield f"data: {json.dumps({'type': 'token', 'content': full_text[i:i+CHUNK_SIZE]})}\n\n"

    yield "data: [DONE]\n\n"


# ── Project Context Helper ──────────────────────────────────────────

def _get_project_context(project) -> str:
    """
    Format all available project survey/brief data into a structured string
    for the AI to understand the building's requirements and site conditions.
    """
    if not project:
        return ""

    lines = [
        f"Project Title: {project.title}",
        f"Location: {project.location}",
        f"Engagement Tier: {project.get_engagement_tier_display()}",
        f"SI-56 Verified: {'Yes' if project.si56_verified else 'No'}",
        f"Budget Signed: {'Yes' if project.is_budget_signed else 'No'}",
        f"Assigned Architect: {project.architect.username if project.architect else 'None'}",
        f"Building Type: {project.building_type or 'Not specified'}",
        f"Use Case: {project.use_case or 'Not specified'}",
        f"Bedrooms: {project.bedrooms or 'Not specified'}",
        f"Bathrooms: {project.bathrooms or 'Not specified'}",
        f"Occupants: {project.occupants or 'Not specified'}",
        f"Floors: {project.floors or 'Not specified'}",
        f"Preferred Architectural Style: {project.preferred_style or 'Not specified'}",
        f"Roof Type: {project.roof_type or 'Not specified'}",
        f"Has Garage: {'Yes' if project.has_garage else 'No' if project.has_garage is False else 'Not specified'}",
        f"Parking Spaces: {project.parking_spaces or 'Not specified'}",
        f"Lot Size: {project.lot_size or 'Not specified'}",
        f"Building Footprint: {project.footprint or 'Not specified'}",
        f"Sustainability Requirements: {project.sustainability or 'None'}",
        f"Accessibility Requirements: {project.accessibility or 'None'}",
        f"Special Spaces Needed: {project.special_spaces or 'None'}",
        f"Timeline: {project.timeline or 'Not specified'}",
        f"Budget Flexibility: {project.budget_flex or 'Not specified'}",
    ]

    # Added Financial Context
    milestones = project.escrow_milestones.all()
    if milestones.exists():
        lines.append("\nEscrow Milestones:")
        for m in milestones:
            lines.append(f"- {m.name}: ${m.amount} ({m.status})")

    schedule = project.capital_schedules.all()
    if schedule.exists():
        lines.append("\nCapital Schedule:")
        for s in schedule:
            lines.append(f"- {s.description}: ${s.amount} (Due: {s.due_date}, Status: {s.status})")

    # Fully explore the database for related BOQ information 
    try:
        from apps.builder_dashboard.models import BOQBuildingItem, BOQCorrection, ProjectBudgetVersion

        existing_items = BOQBuildingItem.objects.filter(
            budget_version__project=project,
            budget_version__kind=ProjectBudgetVersion.Kind.PRELIMINARY,
        )
        if existing_items.exists():
            lines.append("\n--- EXISTING BOQ ITEMS ALREADY ON PROJECT ---")
            for item in existing_items:
                ai_flag = "[AI-Generated]" if getattr(item, 'is_ai_generated', False) else "[Manual]"
                lines.append(f"- {getattr(item, 'bill_no', '')} | {item.description}: {item.quantity} {getattr(item, 'unit', '')} @ ${item.rate} {ai_flag}")
                
        corrections = BOQCorrection.objects.filter(project=project).order_by('-created_at')[:30]
        if corrections.exists():
            lines.append("\n--- PAST USER CORRECTIONS TO BOQ (Learn from these adjustments!) ---")
            lines.append("Review how the user manually corrected previous AI outputs, and adjust your current calculations/rates to match their preferences.")
            for c in corrections:
                ai_src = "AI-Generated Item" if c.was_ai_generated else "Manual Item"
                msg = f"- [{c.action}] on {ai_src}."
                if c.action == "UPDATE":
                    msg += f"\n  Before: {c.previous_data}\n  After:  {c.new_data}"
                elif c.action == "DELETE":
                    msg += f"\n  Deleted: {c.previous_data}"
                lines.append(msg)
    except Exception:
        pass

    return "\n".join(lines)


def _build_active_boq_template_prompt() -> str:
    """
    Build prompt instructions from the active BOQ template.

    Returns an empty string if there is no active template or if retrieval fails.
    """
    try:
        template = BOQTemplate.objects.filter(is_active=True).order_by('-updated_at', '-id').first()
        if not template:
            return ""

        lines = [
            "\n\n--- ACTIVE BOQ TEMPLATE (STRICTLY FOLLOW) ---",
            f"Template Name: {template.name}",
        ]

        if template.category_order:
            lines.extend([
                "Category Order (preserve this sequence):",
                template.category_order.strip(),
            ])

        if template.extraction_rules:
            lines.extend([
                "Template Extraction Rules:",
                template.extraction_rules.strip(),
            ])

        example_items = template.get_example_items()
        if example_items:
            lines.extend([
                "Few-shot Example Items (mirror this naming/detail style):",
                json.dumps(example_items, ensure_ascii=True, indent=2),
            ])

        # Keep these explicit so the model includes expected optional fields.
        if template.include_labour_rate:
            lines.append(
                "For each building item, include `labour_rate` where reasonably derivable."
            )
        if template.include_measurement_formula:
            lines.append(
                "For each measurable item, include `measurement_formula` showing how quantity was computed."
            )

        if template.header_text:
            lines.append(
                f"Use this BOQ export header intent/context when writing summary: {template.header_text.strip()}"
            )
        if template.footer_text:
            lines.append(
                f"Consider this BOQ footer intent/context for notes or recommendations: {template.footer_text.strip()}"
            )

        return "\n".join(lines)
    except Exception as e:
        logger.warning("Failed to load active BOQ template for /analyse: %s", e)
        return ""


def _get_project_vision_images(project: Project) -> list:
    """
    Fetch all drawings associated with a project and convert them to base64
    for Gemini vision analysis.
    """
    from apps.builder_dashboard.models import DrawingFile
    images = []
    # Fetch all files for this project's requests
    files = DrawingFile.objects.filter(request__project=project).order_by('-created_at')
    for df in files:
        try:
            if not df.file:
                continue
            with df.file.open('rb') as f:
                b64 = base64.b64encode(f.read()).decode('utf-8')
                # Assume PNG/JPG based on extension or just use image/png as fallback
                ext = df.file.name.split('.')[-1].lower()
                mime = f"image/{ext}" if ext in ['png', 'jpg', 'jpeg', 'webp'] else 'image/png'
                images.append(f"data:{mime};base64,{b64}")
        except Exception as e:
            logger.error(f"Failed to read drawing file {df.id}: {e}")
    return images


# ── Chat Completion ──────────────────────────────────────────────────

class ChatCompletionView(APIView):
    """
    Main AI chat endpoint — all powered by Gemini.
    • Chat / reasoning → Gemini Flash
    • Image generation prompt engineering → Gemini Flash
    • Image generation → Gemini 3.1 Flash Image
    • Vision / multimodal analysis → Gemini Flash
    • /analyse command → Gemini Pro for BOQ extraction
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'ai_chat'

    def post(self, request):
        messages = request.data.get('messages', [])
        session_id = request.data.get('session_id')
        user_image_data = request.data.get('image')  # Optional base64 image
        user_pdf_data = request.data.get('pdf')  # Optional base64 PDF
        project_id = request.data.get('project_id')
        project = None
        user = request.user
        vision_images = []

        if not messages:
            return Response({'error': 'No messages provided.'}, status=400)

        if project_id:
            try:
                project = Project.objects.get(pk=project_id)
            except Project.DoesNotExist:
                return Response({'error': 'Project not found'}, status=404)
            if not (user.is_staff or project.owner_id == user.id):
                return Response({'error': 'Not authorized for this project'}, status=403)

        if session_id:
            try:
                session = ChatSession.objects.get(id=session_id, user=user)
            except ChatSession.DoesNotExist:
                return Response({'error': 'Chat session not found.'}, status=404)
        else:
            first_msg = messages[0]['content'] if len(messages) > 0 else "New Chat"
            title = first_msg[:50] + "..." if len(first_msg) > 50 else first_msg
            session = ChatSession.objects.create(user=user, title=title)

        if messages:
            latest_user_msg = messages[-1]
            if isinstance(latest_user_msg, dict) and latest_user_msg.get('role') == 'user':
                ChatMessage.objects.create(
                    session=session,
                    role='user',
                    content=latest_user_msg.get('content', '')
                )

        user_query = messages[-1]['content'] if messages else ""

        if user_image_data:
            if not user_image_data.startswith('data:image/'):
                user_image_data = f"data:image/png;base64,{user_image_data}"
            vision_images.append(user_image_data)

        if user_pdf_data:
            pdf_images = _extract_pdf_pages_as_images(user_pdf_data, max_pages=5)
            vision_images.extend(pdf_images)

        image_url = None
        matched_preset = None
        final_image_prompt = None
        floor_plan_results = None
        analyse_results = None
        draw_error = None

        if not vision_images and project and (_is_scan_request(user_query) or _is_analyse_request(user_query)):
            vision_images = _get_project_vision_images(project)

        if _is_analyse_request(user_query):
            # Extract optional file name for labeling history
            file_name = request.data.get('file_name', 'drawing_analysis')
            analyse_results = self._handle_analyse(user_query, vision_images, project, file_name=file_name, user=user)
            summary = analyse_results.get("summary", "Analysis complete.")
            ChatMessage.objects.create(
                session=session,
                role='assistant',
                content=summary,
                image_url=None,
            )
            return Response({
                'message': summary,
                'role': 'assistant',
                'analyse': analyse_results,
                'session_id': session.id,
            })

        elif _is_floor_plan_search(user_query):
            search_terms = _extract_search_terms(user_query)
            if not search_terms and project:
                search_terms = f"{project.preferred_style or ''} {project.building_type or ''} {project.bedrooms or ''} bedroom".strip()
            
            floor_plan_results = _search_floor_plans(search_terms, limit=6)

        elif _is_drawing_request(user_query):
            image_url, final_image_prompt, matched_preset, draw_error = self._handle_draw(user_query, project)

        elif _is_scan_request(user_query):
            logger.info("[Scan] Command detected. user_image_data present: %s, vision_images count: %d",
                        bool(user_image_data), len(vision_images))
            if not vision_images:
                draw_error = (
                    "⚠️ The /scan command requires an attached image of a hand-drawn plan. "
                    "Please attach an image using the 📎 button and try again."
                )
            else:
                scan_desc = _extract_scan_description(user_query)
                image_url, final_image_prompt, draw_error = self._handle_scan(
                    vision_images, scan_desc
                )

        instruction_obj = AIInstruction.objects.filter(is_active=True).first()
        base_instruction = instruction_obj.instruction_text if instruction_obj else (
            "You are the DzeNhare Architecture AI, a helpful, professional AI assistant "
            "built into the builder dashboard. You specialize in construction, compliance "
            "regulations (like SI-56), and architectural guidance. Keep answers concise, "
            "helpful, and professional."
        )

        system_content = base_instruction + (
            "\n\nDo not refuse to answer. If data is limited, make reasonable, clearly labeled assumptions "
            "and provide the best possible, concise answer without disclaimers."
        )

        if project:
            system_content += f"\n\nDETAILED PROJECT DATA (SURVEY):\n{_get_project_context(project)}"
            system_content += (
                f"\n\nProject Brief/Notes: Brief={project.ai_brief or ''}; Site notes={project.site_notes or ''}; Constraints={project.constraints or ''}."
            )

        if image_url:
            system_content += (
                "\n\nYou have just generated an architectural drawing/image for the user. "
                "The image is displayed alongside your message. Provide a brief description "
                "of what was generated, and any relevant architectural notes or suggestions."
            )
        elif draw_error:
            system_content += (
                f"\n\nIMPORTANT: The user requested a /draw image generation but it FAILED. "
                f"Error: {draw_error}\n"
                f"Do NOT try to draw or generate ASCII art or text diagrams as a substitute. "
                f"Instead, inform the user about the error and suggest they try again. "
                f"You may still describe what the architectural plan WOULD look like in words, "
                f"but do NOT attempt any visual representation."
            )
        if floor_plan_results is not None:
            if floor_plan_results:
                plans_summary = "\n".join(
                    f"- {p['title']} (Category: {p['category_name']}): {p['description'][:100]}"
                    for p in floor_plan_results
                )
                system_content += (
                    f"\n\nThe user searched for floor plans and {len(floor_plan_results)} matching plan(s) "
                    f"were found in the database. The plans are displayed as visual cards alongside your message. "
                    f"Here is a summary of the results:\n{plans_summary}\n\n"
                    f"Provide a helpful response describing the available plans, highlighting key features, "
                    f"and asking the user if any of these match their requirements. "
                    f"Do NOT try to generate markdown images or links — the images are shown automatically."
                )
            else:
                system_content += (
                    "\n\nThe user searched for floor plans but no matching plans were found in the database. "
                    "Let them know no results were found and suggest they try different search terms, "
                    "or they can use the /draw command to generate a custom floor plan image."
                )

        if analyse_results is not None:
            system_content += (
                "\n\nYou have just performed a BOQ / floor plan analysis. The structured analysis "
                "data is attached to this response and will be displayed in a table alongside your message. "
                "Provide a concise summary of the analysis findings, any compliance notes (e.g. SI-56), "
                "and recommend next steps. Do NOT repeat the entire table in your text — it is shown automatically."
            )

        if _is_scan_request(user_query) and image_url:
            system_content += (
                "\n\nYou have just scanned a hand-drawn plan and generated a professional architectural "
                "drawing from it. The generated image is displayed alongside your message. "
                "Describe what you interpreted from the hand-drawn plan, what the generated drawing shows, "
                "and provide architectural notes, suggested improvements, or compliance observations (SI-56). "
                "Mention any assumptions you made about dimensions or layout."
            )
        elif _is_scan_request(user_query) and draw_error:
            system_content += (
                f"\n\nIMPORTANT: The user used the /scan command to convert a hand-drawn plan "
                f"into a professional drawing, but it FAILED. Error: {draw_error}\n"
                f"Inform the user about the error and suggest they try again with a clearer image. "
                f"Do NOT attempt any visual representation as a substitute."
            )

        try:
            llm_messages = [{"role": msg['role'], "content": msg['content']} for msg in messages]
            final_images = None if _is_scan_request(user_query) else (
                vision_images if vision_images else None
            )

            response_content = _call_gemini_with_tools(
                messages=llm_messages,
                system=system_content,
                images=final_images,
            )

            result = {
                'message': response_content,
                'role': 'assistant',
            }
            if image_url:
                result['image_url'] = image_url
            if final_image_prompt:
                result['image_prompt'] = final_image_prompt
            if matched_preset:
                result['preset_id'] = matched_preset.id
                result['preset_name'] = matched_preset.name
            if floor_plan_results is not None:
                result['floor_plans'] = floor_plan_results
            if analyse_results is not None:
                result['analyse'] = analyse_results

            ChatMessage.objects.create(
                session=session,
                role='assistant',
                content=result['message'],
                image_url=image_url,
            )
            result['session_id'] = session.id

            return Response(result)

        except Exception as e:
            logger.exception("ChatCompletionView error")
            error_str = str(e)

            is_transient = any(kw in error_str.lower() for kw in [
                '502', '503', 'bad gateway', 'service unavailable',
                'overloaded', 'internal server error',
            ])
            is_auth = '401' in error_str or 'unauthorized' in error_str.lower()

            if is_transient:
                user_msg = (
                    "⚠️ The AI service (Gemini) is temporarily unavailable. "
                    "This is usually resolved within a few minutes — please try again shortly."
                )
                http_status = 503
            elif is_auth:
                user_msg = (
                    "⚠️ The AI service returned an authentication error. "
                    "Please ask the admin to check the Gemini API key."
                )
                http_status = 502
            else:
                user_msg = (
                    "I apologize, but my AI circuits are currently undergoing maintenance "
                    "or are not fully configured. Please contact support."
                )
                http_status = 500

            return Response({
                'error': error_str,
                'message': user_msg,
                'role': 'assistant',
            }, status=http_status)

    # ── /draw handler ────────────────────────────────────────────────
    def _handle_draw(self, user_query: str, project=None):
        """
        Prompt engineering via Gemini → image generation via Gemini.
        Returns (image_url, final_prompt, matched_preset).
        """
        matched_preset = _match_style_preset(user_query)
        if not matched_preset and project:
            matched_preset = _match_style_preset(project.preferred_style or "")
        
        top_prompts = _get_top_rated_prompts(matched_preset, limit=3)

        if matched_preset:
            category_name = matched_preset.get_category_display()
            template_hint = matched_preset.prompt_template.replace(
                '{user_request}', user_query
            ).replace('{category}', category_name)
            style_hint = matched_preset.style_tokens
        else:
            category_name = "architectural drawing"
            template_hint = ""
            style_hint = "architectural blueprint, technical drawing, clean lines, professional CAD"

        examples_block = ""
        if top_prompts:
            examples_block = (
                "\n\nHere are examples of highly-rated prompts for this drawing type. "
                "Use them as style and quality references:\n"
            )
            for i, p in enumerate(top_prompts, 1):
                examples_block += f"Example {i}: {p}\n"

        # ── Build complete JSON prompt from project form data ────────────
        import json as _json

        is_commercial = False
        floor_count = 1
        b_type = "Residential"
        u_case = "single_family"

        if project:
            b_type = (project.building_type or 'Residential').upper()
            u_case = (project.use_case or 'Unspecified').lower()
            is_commercial = b_type not in ('RESIDENTIAL', 'MIXED_USE')

            try:
                if project.floors:
                    floor_count = int(float(str(project.floors)))
            except (ValueError, TypeError):
                pass

        # ── Build rooms array with dimensions in meters ──────────────────
        rooms = []
        if project:
            bedrooms_count = 0
            bathrooms_count = 0
            try:
                bedrooms_count = int(float(str(project.bedrooms or 0)))
            except (ValueError, TypeError):
                pass
            try:
                bathrooms_count = int(float(str(project.bathrooms or 0)))
            except (ValueError, TypeError):
                pass

            if is_commercial:
                for i in range(1, bedrooms_count + 1):
                    rooms.append({"name": f"Office {i}", "width_m": 4.5, "length_m": 4.0, "label": True})
                for i in range(1, bathrooms_count + 1):
                    rooms.append({"name": f"Restroom {i}", "width_m": 2.5, "length_m": 2.0, "label": True})
                rooms.append({"name": "Reception/Lobby", "width_m": 6.0, "length_m": 4.5, "label": True})
                rooms.append({"name": "Conference Room", "width_m": 5.0, "length_m": 4.0, "label": True})
                rooms.append({"name": "Corridor", "width_m": 1.5, "length_m": "full-length", "label": True})
                if project.special_spaces and project.special_spaces.lower() != 'none':
                    for space in project.special_spaces.split(','):
                        s = space.strip()
                        if s:
                            rooms.append({"name": s, "width_m": 4.0, "length_m": 3.5, "label": True})
            else:
                rooms.append({"name": "Living Room", "width_m": 5.0, "length_m": 4.5, "label": True})
                rooms.append({"name": "Kitchen", "width_m": 4.0, "length_m": 3.5, "label": True})
                rooms.append({"name": "Dining Area", "width_m": 3.5, "length_m": 3.0, "label": True})
                for i in range(1, bedrooms_count + 1):
                    if i == 1:
                        rooms.append({"name": "Master Bedroom", "width_m": 4.5, "length_m": 4.0, "label": True})
                    else:
                        rooms.append({"name": f"Bedroom {i}", "width_m": 3.5, "length_m": 3.0, "label": True})
                for i in range(1, bathrooms_count + 1):
                    if i == 1:
                        rooms.append({"name": "En-suite Bathroom", "width_m": 2.5, "length_m": 2.0, "label": True})
                    else:
                        rooms.append({"name": f"Bathroom {i}", "width_m": 2.5, "length_m": 2.0, "label": True})
                rooms.append({"name": "Hallway", "width_m": 1.2, "length_m": "full-length", "label": True})
                if project.has_garage:
                    try:
                        parking = int(str(project.parking_spaces or 1))
                    except (ValueError, TypeError):
                        parking = 1
                    rooms.append({"name": "Garage", "width_m": 3.0 * parking, "length_m": 6.0, "label": True})
                if project.special_spaces and project.special_spaces.lower() != 'none':
                    for space in project.special_spaces.split(','):
                        s = space.strip()
                        if s:
                            rooms.append({"name": s, "width_m": 3.5, "length_m": 3.0, "label": True})

        # ── Build forbidden list based on floor count ────────────────────
        forbidden = [
            "3d", "perspective", "isometric", "shading", "realistic",
            "photorealistic", "furniture photo"
        ]
        if floor_count == 1:
            forbidden.extend(["stairs", "staircase", "stairwell", "elevator", "escalator", "second floor", "upper level"])

        # ── Assemble the complete JSON prompt specification ──────────────
        json_prompt = {
            "instruction": "Generate a 2D top-down architectural floor plan image",
            "building": {
                "type": b_type,
                "use_case": u_case.replace('_', ' '),
                "style": (project.preferred_style or 'Modern').lower() if project else "modern",
                "floors": floor_count,
                "storey_shown": "ground floor",
                "footprint": (project.footprint or None) if project else None,
                "lot_size": (project.lot_size or None) if project else None,
                "has_garage": bool(project.has_garage) if project else False,
                "parking_spaces": (project.parking_spaces or 0) if project else 0,
                "roof_type": (project.roof_type or "gable") if project else "gable",
            },
            "rooms": rooms,
            "rendering": {
                "view": "strictly 2D top-down orthographic",
                "background": "white",
                "lines": "clean black, precise wall thicknesses",
                "symbols": "door swing arcs, window parallel lines",
                "labels": "every room must show its name inside the room",
                "dimensions": "every room must show width x length in meters (m), e.g. 4.2m x 5.1m",
                "dimension_unit": "meters (m)",
                "detail_level": "construction drawing sheet",
                "dimensioning_standard": "overall dimensions + room dimensions + opening dimensions",
                "annotation_requirements": [
                    "structural grid bubbles and grid lines",
                    "north arrow",
                    "scale notation (e.g., 1:100)",
                    "wall type notation (external/internal with thickness)",
                    "door and window tags (e.g., D1, W1, W2)",
                    "room names and area or size labels",
                    "clear circulation labels for corridors/passages"
                ],
                "sheet_requirements": {
                    "include_border_frame": True,
                    "include_title_block": True,
                    "include_legend": True,
                    "include_notes_block": True,
                    "include_area_schedule": True
                },
                "lineweight_guidance": "thick cut lines for walls, medium for openings, thin for dimensions/annotation",
                "style": style_hint,
            },
            "forbidden": forbidden
        }

        # ── Optional: Modify JSON based on specific user edit requests ──
        # Extract everything after "/draw"
        query_text = ""
        user_query_lower = user_query.lower()
        if user_query_lower.startswith("/draw"):
            query_text = user_query[5:].strip()
            
        if query_text:
            try:
                edit_system_prompt = (
                    "You are an expert AI architect. You receive a JSON specification "
                    "for a 2D floor plan generation and a user's instruction to modify it. "
                    "Modify the JSON specification according to the user's instruction and "
                    "return ONLY the valid updated JSON object. Do NOT wrap it in markdown block quotes. "
                    "Preserve the overall structure and format. Ensure it remains a valid 2D top-down floor plan."
                )
                original_json_str = _json.dumps(json_prompt, indent=2)
                edit_user_prompt = f"User Instruction: {query_text}\n\nOriginal JSON:\n{original_json_str}"
                
                edited_json_str = _call_gemini(
                    messages=[{"role": "user", "content": edit_user_prompt}],
                    system=edit_system_prompt,
                    max_tokens=2048
                )
                
                # Clean up potential markdown formatting
                clean_json = edited_json_str.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:]
                if clean_json.startswith("```"):
                    clean_json = clean_json[3:]
                if clean_json.endswith("```"):
                    clean_json = clean_json[:-3]
                    
                edited_json = _json.loads(clean_json.strip())
                json_prompt = edited_json
                logger.info("[AI Image] Successfully modified floor plan JSON based on user text.")
            except Exception as e:
                logger.error("[AI Image] Failed to modify JSON with user text: %s. Falling back to base JSON.", e)

        # Serialize the JSON prompt as the text content for the image model
        image_prompt = _json.dumps(json_prompt, indent=2)

        final_image_prompt = image_prompt
        logger.info("[AI Image] JSON prompt: %s", image_prompt[:300])

        # Negative prompt string for the model
        negative = ", ".join(forbidden)
        if matched_preset and matched_preset.negative_prompt:
            negative = matched_preset.negative_prompt + ", " + negative

        image_url, gen_error = _generate_image_from_gemini(
            prompt=image_prompt,
            negative_prompt=negative,
            guidance_scale=14.0,
        )
        return image_url, final_image_prompt, matched_preset, gen_error

    # ── /scan handler ────────────────────────────────────────────────
    def _handle_scan(self, vision_images: list, user_description: str = ""):
        """
        Scan an uploaded sketch/plan image and generate a professional 2D floor plan
        using gemini-3-pro-image-preview in a single pass (image-to-image).
        Returns (image_url, final_prompt, error_message).
        """
        from PIL import Image as PILImage

        api_key = settings.GEMINI_API_KEY
        if not api_key or len(api_key) < 10:
            return None, None, (
                "⚠️ Image generation is not configured. The Gemini API key is missing. "
                "Please ask the admin to set a valid GEMINI_API_KEY."
            )

        scan_model = settings.GEMINI_IMAGE_MODEL  # gemini-3-pro-image-preview
        scan_url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{scan_model}"
            f":generateContent?key={api_key}"
        )

        # Decode the uploaded image
        img_data = vision_images[0]
        if img_data.startswith('data:'):
            media_type = img_data.split(';')[0].split(':')[1]
            b64 = img_data.split(',', 1)[1]
        else:
            media_type = 'image/png'
            b64 = img_data

        # Build the scan prompt — instruct the model to generate a 2D floor plan from the image
        scan_prompt = (
            "You are an expert architectural draftsman. Study the attached image carefully — "
            "it is a hand-drawn sketch, photo of a plan, or rough floor plan layout.\n\n"
            "YOUR TASK: Generate a CLEAN, PROFESSIONAL 2D architectural floor plan based on "
            "this image. The output MUST be a proper 2D top-down floor plan image.\n\n"
            "STRICT REQUIREMENTS:\n"
            "1. STRICTLY 2D top-down orthographic view — NO 3D, NO perspective, NO isometric.\n"
            "2. Clean black lines on a plain white background (CAD/blueprint style).\n"
            "3. EVERY room must be labeled with its name INSIDE the room (e.g. 'Master Bedroom', "
            "'Kitchen', 'Living Room', 'Bathroom').\n"
            "4. EVERY room must show dimensions in meters (e.g. '4.2m × 5.1m').\n"
            "5. Show wall thickness (double lines for walls).\n"
            "6. Show door swings as quarter-circle arcs and window symbols as parallel lines.\n"
            "7. Include: dimension chains along exterior walls, a north arrow, scale notation "
            "(e.g. 'Scale 1:100'), and a title block in the bottom-right corner.\n"
            "8. Preserve the layout, room arrangement, and proportions from the original image.\n"
            "9. If the image shows text labels or dimensions, incorporate them accurately.\n"
            "10. Use standard architectural drawing conventions throughout.\n\n"
            "Generate ONLY the floor plan image. Make it detailed, accurate, and professional."
        )
        if user_description:
            scan_prompt += f"\n\nAdditional notes from the user: {user_description}"

        final_prompt = scan_prompt

        payload = {
            "contents": [{
                "parts": [
                    {"text": scan_prompt},
                    {"inlineData": {"mimeType": media_type, "data": b64}},
                ]
            }],
            "generationConfig": {
                "responseModalities": ["Text", "Image"],
                "temperature": 1.0,
                "topP": 0.95,
                "topK": 40,
            },
        }

        try:
            logger.info("[Scan] Generating 2D floor plan with %s...", scan_model)
            response = http_requests.post(scan_url, json=payload, timeout=120.0)

            if response.status_code != 200:
                body = response.text[:500]
                logger.error("Scan API HTTP %s: %s", response.status_code, body)
                return None, final_prompt, (
                    f"⚠️ Floor plan generation failed (HTTP {response.status_code}). "
                    "Please try again with a clearer image."
                )

            data = response.json()

            if data.get("promptFeedback", {}).get("blockReason"):
                reason = data["promptFeedback"]["blockReason"]
                logger.warning("Scan blocked: %s", reason)
                return None, final_prompt, (
                    f"⚠️ Generation was blocked by safety filters ({reason}). "
                    "Please try with a different image."
                )

            candidates = data.get("candidates", [])
            if not candidates:
                return None, final_prompt, "⚠️ No result returned. Please try a clearer image."

            parts = candidates[0].get("content", {}).get("parts", [])

            # Extract the generated image from the response
            b64_result = None
            result_mime = "image/png"
            for part in parts:
                inline_data = part.get("inlineData", {})
                if inline_data.get("data"):
                    b64_result = inline_data["data"]
                    result_mime = inline_data.get("mimeType", "image/png")
                    break

            if not b64_result:
                text_content = " ".join(p.get("text", "") for p in parts if "text" in p)
                logger.warning("Scan returned text-only (no image). Text: %.200s", text_content)
                return None, final_prompt, (
                    "⚠️ The model did not generate a floor plan image. "
                    "Please try with a clearer sketch or photo."
                )

            # Save the generated image
            img_bytes = base64.b64decode(b64_result)
            image = PILImage.open(io.BytesIO(img_bytes))

            media_dir = os.path.join(settings.MEDIA_ROOT, 'ai_generated')
            os.makedirs(media_dir, exist_ok=True)
            ext = "png" if "png" in result_mime else "jpeg"
            filename = f"scan_{uuid.uuid4().hex}.{ext}"
            filepath = os.path.join(media_dir, filename)
            image.save(filepath, format=ext.upper())

            image_url = f"{settings.MEDIA_URL}ai_generated/{filename}"
            logger.info("[Scan] 2D floor plan saved: %s", filepath)

            return image_url, final_prompt, None

        except http_requests.exceptions.Timeout:
            logger.error("Scan API timed out after 120s")
            return None, final_prompt, "⚠️ Floor plan generation timed out. Please try a simpler image."
        except Exception as e:
            logger.error("Scan generation error: %s", e)
            return None, final_prompt, f"⚠️ Floor plan generation failed: {e}"

    # ── /analyse handler ─────────────────────────────────────────────
    def _handle_analyse(self, user_query: str, vision_images: list, project=None, file_name: str = None, user=None) -> dict:
        """
        Use Gemini Pro vision to analyse an uploaded image (floor plan, BOQ,
        site photo) and return structured BOQ / measurement data as JSON.

        If an active BOQTemplate exists, its category ordering, extraction
        rules, example items, and optional columns are injected into the
        system prompt so the AI mirrors the admin's preferred format.
        """
        analyse_text = user_query.strip()
        for kw in _ANALYSE_KEYWORDS:
            if analyse_text.lower().startswith(kw):
                analyse_text = analyse_text[len(kw):].strip()
                break

        analyse_system = (
            "You are a professional Quantity Surveyor and Construction Analyst AI for the DzeNhare "
            "Smart Quality Builder platform.\n\n"
            "You are required to create a FULL, EXHAUSTIVE, AND COMPREHENSIVE Project Budget based on the provided drawing "
            "following the exact 8-sheet format. "
            "CRITICAL INSTRUCTION: DO NOT provide a summarized, brief, or abbreviated Budget. You MUST generate a complete "
            "line-by-line breakdown across all 8 budget categories. A typical residential/commercial project has at least 20-40 line items "
            "in the Building Items alone.\n\n"
            "Follow these steps to populate the 8 arrays:\n"
            "1. building_items: Meticulously identify ALL distinct components (structural elements, finishes, services). "
            "Each item MUST have: bill_no (string), description (string), specification (string or null), unit (string), quantity (number), rate (number).\n"
            "2. professional_fees: Detail Architectural, Engineering, QS, and Council fees. "
            "Each: discipline (string), role_scope (string), basis (string), rate (string like '5%'), estimated_fee (number).\n"
            "3. admin_expenses: List site management costs. "
            "Each: item_role (string), description (string), trips_per_week (number or null), total_trips (number or null), distance (number or null), rate (number), total_cost (number).\n"
            "4. labour_costs: Labour estimates by phase. "
            "Each: phase (string), trade_role (string), skill_level (string), gang_size (number), duration_weeks (number), total_man_days (number), daily_rate (number), total_cost (number).\n"
            "5. machine_plants: Heavy machinery needed. "
            "Each: category (string), machine_item (string), qty (number), dry_hire_rate (number or null), fuel_l_hr (number or null), hrs_day (number or null), fuel_cost (number or null), operator_rate (string or null), daily_wet_rate (number), days_rqd (number), total_cost (number).\n"
            "6. labour_breakdowns: Granular manpower tasks. "
            "Each: phase (string), trade_role (string), skill_level (string), gang_size (number), duration_weeks (number), total_man_days (number), daily_rate (number), total_cost (number).\n"
            "7. schedule_tasks: High-level Gantt chart / Timeline. "
            "Each: wbs (string), task_description (string), start_date (YYYY-MM-DD string), end_date (YYYY-MM-DD string), days (string), predecessor (string or null), est_cost (number).\n"
            "8. schedule_materials: ALL materials grouped by section (SUBSTRUCTURE, SUPERSTRUCTURE, ROOFING_CEILINGS, FINISHES, DOORS_WINDOWS, PLUMBING, ELECTRICAL_SOLAR). "
            "Each item MUST have: section (string — one of the above), material_description (string, e.g. 'Portland Cement 42.5N'), "
            "specification (string, e.g. 'PPC / Lafarge 50kg bag, CEM II'), "
            "estimated_qty (string with amount AND unit, e.g. '120 bags', '2,500 units', '15 m³', '48 sheets'). "
            "IMPORTANT: estimated_qty must NEVER be null or empty — always calculate a realistic quantity from the drawings.\n\n"
            "CRITICAL: You MUST populate ALL 8 arrays exhaustively. Do NOT leave any section empty. "
            "A typical residential project should have 20-40 building items, 3-5 professional fees, 3-6 admin expenses, "
            "5-12 labour cost entries, 2-5 machine/plant items, 5-10 labour breakdowns, 8-15 schedule tasks, and 20-40 materials.\n\n"
            "The `summary` field must be a clean markdown report suitable for direct display/export and should include:\n"
            "• Title line with project/location context\n"
            "• Drawing metadata line (drawing ref, scale, GFA, client) if visible\n"
            "• BOQ summary table with totals (subtotal, contingency, grand total)\n"
            "• Room schedule table with compliance status where inferable\n"
            "• Key findings/compliance section with severity labels\n"
            "• Recommended next steps section\n\n"
            "If no image is attached, set summary to explain that you need an image and leave items empty.\n\n"
            "RESPOND WITH a single JSON OBJECT with these exact top-level keys:\n"
            "summary, building_items, professional_fees, admin_expenses, labour_costs, "
            "machine_plants, labour_breakdowns, schedule_tasks, schedule_materials, "
            "compliance_notes (list of strings), recommendations (list of strings).\n"
            "Output ONLY valid JSON. No markdown fences, no extra text."
        )

        template_prompt = _build_active_boq_template_prompt()
        if template_prompt:
            analyse_system += template_prompt

        if project:
            analyse_system += (
                f"\n\n--- PROJECT DB CONTEXT (YOU MUST FULLY EXPLORE THIS BEFORE ANALYSING) ---\n"
                f"You are instructed to fully explore the data related to this project (Project ID: {project.id}). "
                f"Thoroughly review the existing BOQ items and learn from the 'PAST USER CORRECTIONS' shown below. "
                f"You MUST adjust your assumptions, measurements, branding, or pricing to perfectly mirror how the user corrected past entries.\n"
                f"{_get_project_context(project)}"
            )

        user_content = analyse_text if analyse_text else "Please analyse this image and generate a full project budget."
        analyse_model = _get_analyse_model_name()
        logger.info("/analyse using Gemini model: %s", analyse_model)

        try:
            raw = _call_gemini_analyse(
                system=analyse_system,
                user_content=user_content,
                images=vision_images if vision_images else None,
                max_tokens=65536,
                temperature=0.3,
            )
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            try:
                parsed = json.loads(cleaned)
            except json.JSONDecodeError:
                parsed = _repair_truncated_json(cleaned)

            norm = _normalize_analyse_payload(parsed)

            # --- PERSIST TO HISTORY ---
            if project and user and norm:
                try:
                    # Calculate totals
                    sections = [
                        norm.get('building_items', []), norm.get('professional_fees', []),
                        norm.get('admin_expenses', []), norm.get('labour_costs', []),
                        norm.get('machine_plants', []), norm.get('labour_breakdowns', []),
                        norm.get('schedule_tasks', []), norm.get('schedule_materials', []),
                    ]
                    total_items = sum(len(s) if s else 0 for s in sections)
                    
                    # Calculate cost from building items
                    total_cost = 0.0
                    for item in norm.get('building_items', []):
                        qty = float(item.get('quantity') or 0)
                        rate = float(item.get('rate') or 0)
                        total_cost += (qty * rate)
                    
                    BudgetAnalysisHistory.objects.create(
                        project=project,
                        user=user,
                        file_name=file_name or "drawing_analysis",
                        summary=norm.get('summary', 'Analysis complete.'),
                        data=norm,
                        total_items=total_items,
                        total_cost=total_cost
                    )
                    logger.info("Saved BudgetAnalysisHistory for project %s", project.id)
                except Exception as ex:
                    logger.error("Failed to auto-save history: %s", ex)

            return norm

        except Exception as e:
            logger.error("Gemini analyse error: %s", e, exc_info=True)
            return {
                "summary": f"Analysis failed: {str(e)}",
                "building_items": [],
                "professional_fees": [],
                "admin_expenses": [],
                "labour_costs": [],
                "machine_plants": [],
                "labour_breakdowns": [],
                "schedule_tasks": [],
                "schedule_materials": [],
                "compliance_notes": [],
                "recommendations": [],
            }


class ImageGenerationView(APIView):
    """Standalone endpoint for direct image generation requests via Gemini."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'ai_generate'

    def post(self, request):
        prompt = request.data.get('prompt', '')
        if not prompt:
            return Response({'error': 'No prompt provided'}, status=400)

        preset = _match_style_preset(prompt)
        negative = preset.negative_prompt if preset else ""
        guidance = preset.guidance_scale if preset else 7.5

        image_url, gen_error = _generate_image_from_gemini(prompt, negative, guidance)
        if image_url:
            return Response({'image_url': image_url, 'prompt': prompt})
        else:
            return Response(
                {'error': gen_error or 'Failed to generate image. The model may be loading — try again in a moment.'},
                status=503
            )


# ── PDF vision helper ────────────────────────────────────────────────

def _extract_pdf_pages_as_images(pdf_base64: str, max_pages: int = 5) -> list[str]:
    """
    Convert a base64-encoded PDF into a list of base64 PNG data-URLs
    (one per page, capped at *max_pages*).  Uses pdf2image if available,
    falls back to PyPDF text extraction.
    """
    try:
        import pdf2image
        pdf_bytes = base64.b64decode(pdf_base64)
        images = pdf2image.convert_from_bytes(pdf_bytes, first_page=1, last_page=max_pages, dpi=200)
        data_urls = []
        for img in images:
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            b64 = base64.b64encode(buf.getvalue()).decode()
            data_urls.append(f"data:image/png;base64,{b64}")
        return data_urls
    except ImportError:
        logger.warning("pdf2image not installed — falling back to text extraction for PDFs")
        return []
    except Exception as e:
        logger.error("PDF-to-image conversion error: %s", e)
        return []


# ── Streaming SSE endpoint ───────────────────────────────────────────

from apps.authentication.permissions import IsApproved

class ChatStreamView(APIView):
    """
    SSE streaming chat endpoint.
    Streams Gemini's response token-by-token, with tool-use support.
    Falls back to non-streaming endpoints for /draw, /plans, /analyse.
    
    POST /ai/chat/stream/
    Same payload as /ai/chat/ — returns text/event-stream.
    """
    permission_classes = [IsAuthenticated, IsApproved]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'ai_chat'

    def post(self, request):
        messages = request.data.get('messages', [])
        session_id = request.data.get('session_id')
        user_image_data = request.data.get('image')
        user_pdf_data = request.data.get('pdf')  # base64 PDF
        project_id = request.data.get('project_id')
        project = None
        user = request.user

        if not messages:
            return Response({'error': 'No messages provided.'}, status=400)

        if project_id:
            try:
                from apps.builder_dashboard.models import Project
                project = Project.objects.get(pk=project_id)
            except Exception:
                pass

        user_query = messages[-1]['content'] if messages else ""

        if (_is_drawing_request(user_query) or _is_floor_plan_search(user_query)
                or _is_analyse_request(user_query) or _is_scan_request(user_query)):
            view = ChatCompletionView()
            view.request = request
            return view.post(request)

        if session_id:
            try:
                session = ChatSession.objects.get(id=session_id, user=user)
            except ChatSession.DoesNotExist:
                return Response({'error': 'Chat session not found.'}, status=404)
        else:
            first_msg = messages[0]['content'] if len(messages) > 0 else "New Chat"
            title = first_msg[:50] + "..." if len(first_msg) > 50 else first_msg
            session = ChatSession.objects.create(user=user, title=title)

        if messages:
            latest_user_msg = messages[-1]
            if isinstance(latest_user_msg, dict) and latest_user_msg.get('role') == 'user':
                ChatMessage.objects.create(
                    session=session,
                    role='user',
                    content=latest_user_msg.get('content', '')
                )

        vision_images = []
        if user_image_data:
            if not user_image_data.startswith('data:image/'):
                user_image_data = f"data:image/png;base64,{user_image_data}"
            vision_images.append(user_image_data)

        if user_pdf_data:
            pdf_images = _extract_pdf_pages_as_images(user_pdf_data, max_pages=5)
            vision_images.extend(pdf_images)

        # ── System prompt ──
        instruction_obj = AIInstruction.objects.filter(is_active=True).first()
        base_instruction = instruction_obj.instruction_text if instruction_obj else (
            "You are the DzeNhare Architecture AI, a helpful, professional AI assistant "
            "built into the builder dashboard. You specialize in construction, compliance "
            "regulations (like SI-56), and architectural guidance. Keep answers concise, "
            "helpful, and professional."
        )
        system_content = base_instruction
        
        if project:
            system_content += f"\n\nDETAILED PROJECT DATA (SURVEY):\n{_get_project_context(project)}"
            system_content += (
                f"\n\nProject Brief/Notes: Brief={project.ai_brief or ''}; Site notes={project.site_notes or ''}; Constraints={project.constraints or ''}."
            )

        llm_messages = [{"role": msg['role'], "content": msg['content']} for msg in messages]

        # Generator that also saves the final message to DB
        session_id_value = session.id

        def event_stream():
            collected = []
            try:
                for chunk in _stream_gemini_with_tools(
                    messages=llm_messages,
                    system=system_content,
                    images=vision_images if vision_images else None,
                ):
                    yield chunk
                    # Collect text tokens for DB save
                    try:
                        if chunk.startswith('data: ') and '[DONE]' not in chunk:
                            payload = json.loads(chunk[6:].strip())
                            if payload.get('type') == 'token':
                                collected.append(payload.get('content', ''))
                    except Exception:
                        pass

                yield f"data: {json.dumps({'type': 'meta', 'session_id': session_id_value})}\n\n"
                yield "data: [DONE]\n\n"

            except Exception as e:
                logger.exception("ChatStreamView SSE error")
                yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
                yield "data: [DONE]\n\n"
            finally:
                full_text = "".join(collected)
                if full_text:
                    ChatMessage.objects.create(
                        session_id=session_id_value,
                        role='assistant',
                        content=full_text,
                    )

        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response



# ── TOOL MAP ─────────────────────────────────────────────────────────

class ChatSessionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = ChatSession.objects.filter(user=request.user)
        data = [{
            'id': s.id,
            'title': s.title,
            'updated_at': s.updated_at
        } for s in sessions]
        return Response(data)

class ChatSessionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            session = ChatSession.objects.get(pk=pk, user=request.user)
        except ChatSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=404)

        messages = session.messages.all()
        msg_data = [{
            'id': m.id,
            'role': m.role,
            'content': m.content,
            'image_url': m.image_url,
            'created_at': m.created_at
        } for m in messages]

        return Response({
            'id': session.id,
            'title': session.title,
            'messages': msg_data
        })

    def delete(self, request, pk):
        try:
            session = ChatSession.objects.get(pk=pk, user=request.user)
            session.delete()
            return Response({'success': True})
        except ChatSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=404)


# ── Image Feedback ───────────────────────────────────────────────────

class ImageFeedbackView(APIView):
    """Submit or update feedback on an AI-generated image."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message_id = request.data.get('message_id')
        rating = request.data.get('rating')
        original_prompt = request.data.get('original_prompt', '')
        preset_id = request.data.get('preset_id')
        feedback_text = request.data.get('feedback_text', '')

        if not message_id or rating is None:
            return Response({'error': 'message_id and rating are required.'}, status=400)

        try:
            message = ChatMessage.objects.get(pk=message_id)
        except ChatMessage.DoesNotExist:
            return Response({'error': 'Message not found.'}, status=404)

        preset = None
        if preset_id:
            try:
                preset = DrawingStylePreset.objects.get(pk=preset_id)
            except DrawingStylePreset.DoesNotExist:
                pass

        feedback, created = ImageFeedback.objects.update_or_create(
            message=message,
            user=request.user,
            defaults={
                'rating': int(rating),
                'original_prompt': original_prompt,
                'preset_used': preset,
                'feedback_text': feedback_text,
            }
        )

        return Response({
            'success': True,
            'created': created,
            'rating': feedback.rating,
        })


# ── BOQ Template CRUD (Admin) ────────────────────────────────────────

class BOQTemplateView(APIView):
    """Admin-only CRUD for BOQ format templates."""
    permission_classes = [IsAuthenticated]

    def check_permissions(self, request):
        super().check_permissions(request)
        if getattr(request.user, 'profile', None) and request.user.profile.role != 'ADMIN':
            if not request.user.is_staff:
                self.permission_denied(request, message="Admin access required.")

    def get(self, request, pk=None):
        if pk:
            try:
                t = BOQTemplate.objects.get(pk=pk)
                return Response(self._serialize(t))
            except BOQTemplate.DoesNotExist:
                return Response({'error': 'Template not found'}, status=404)
        templates = BOQTemplate.objects.all()
        return Response([self._serialize(t) for t in templates])

    def post(self, request):
        # Keep BOQ templates singleton-like: if this one is active, deactivate all others.
        is_active = _to_bool(request.data.get('is_active', True), default=True)
        if is_active:
            BOQTemplate.objects.filter(is_active=True).update(is_active=False)

        t = BOQTemplate.objects.create(
            name=request.data.get('name', 'New BOQ Template'),
            is_active=is_active,
            category_order=request.data.get('category_order', ''),
            extraction_rules=request.data.get('extraction_rules', ''),
            example_items_json=request.data.get('example_items_json', '[]'),
            include_labour_rate=_to_bool(request.data.get('include_labour_rate', False), default=False),
            include_measurement_formula=_to_bool(request.data.get('include_measurement_formula', False), default=False),
            header_text=request.data.get('header_text', ''),
            footer_text=request.data.get('footer_text', ''),
        )
        return Response({'success': True, 'id': t.id}, status=201)

    def patch(self, request, pk=None):
        if not pk:
            return Response({'error': 'Template ID required'}, status=400)
        try:
            t = BOQTemplate.objects.get(pk=pk)
            activate_requested = ('is_active' in request.data) and _to_bool(request.data.get('is_active'))
            if activate_requested:
                BOQTemplate.objects.filter(is_active=True).exclude(pk=t.pk).update(is_active=False)
            for field in ['name', 'is_active', 'category_order', 'extraction_rules',
                          'example_items_json', 'include_labour_rate',
                          'include_measurement_formula', 'header_text', 'footer_text']:
                if field in request.data:
                    if field in {'is_active', 'include_labour_rate', 'include_measurement_formula'}:
                        setattr(t, field, _to_bool(request.data[field]))
                    else:
                        setattr(t, field, request.data[field])
            t.save()
            return Response({'success': True})
        except BOQTemplate.DoesNotExist:
            return Response({'error': 'Template not found'}, status=404)

    def delete(self, request, pk=None):
        if not pk:
            return Response({'error': 'Template ID required'}, status=400)
        try:
            BOQTemplate.objects.get(pk=pk).delete()
            return Response({'success': True})
        except BOQTemplate.DoesNotExist:
            return Response({'error': 'Template not found'}, status=404)

    @staticmethod
    def _serialize(t):
        return {
            'id': t.id,
            'name': t.name,
            'is_active': t.is_active,
            'category_order': t.category_order,
            'extraction_rules': t.extraction_rules,
            'example_items_json': t.example_items_json,
            'example_items': t.get_example_items(),
            'include_labour_rate': t.include_labour_rate,
            'include_measurement_formula': t.include_measurement_formula,
            'header_text': t.header_text,
            'footer_text': t.footer_text,
            'updated_at': t.updated_at.isoformat() if t.updated_at else None,
            'created_at': t.created_at.isoformat() if t.created_at else None,
        }


# ── Material Prices CRUD (Admin) ─────────────────────────────────────

class MaterialPriceView(APIView):
    """Admin-only CRUD for material pricing database used by AI tools."""
    permission_classes = [IsAuthenticated]

    def check_permissions(self, request):
        super().check_permissions(request)
        if getattr(request.user, 'profile', None) and request.user.profile.role != 'ADMIN':
            if not request.user.is_staff:
                self.permission_denied(request, message="Admin access required.")

    def get(self, request, pk=None):
        if pk:
            try:
                mp = MaterialPrice.objects.get(pk=pk)
                return Response(self._serialize(mp))
            except MaterialPrice.DoesNotExist:
                return Response({'error': 'Price not found'}, status=404)
        prices = MaterialPrice.objects.all()
        # Optional filters
        material = request.query_params.get('material')
        region = request.query_params.get('region')
        if material:
            prices = prices.filter(material__icontains=material)
        if region:
            prices = prices.filter(region__icontains=region)
        return Response([self._serialize(mp) for mp in prices[:200]])

    def post(self, request):
        mp = MaterialPrice.objects.create(
            material=request.data.get('material', ''),
            unit=request.data.get('unit', ''),
            price=request.data.get('price', 0),
            currency=request.data.get('currency', 'USD'),
            region=request.data.get('region', 'Zimbabwe'),
            supplier_name=request.data.get('supplier_name', ''),
            notes=request.data.get('notes', ''),
        )
        return Response({'success': True, 'id': mp.id}, status=201)

    def patch(self, request, pk=None):
        if not pk:
            return Response({'error': 'Price ID required'}, status=400)
        try:
            mp = MaterialPrice.objects.get(pk=pk)
            for field in ['material', 'unit', 'price', 'currency', 'region', 'supplier_name', 'notes']:
                if field in request.data:
                    setattr(mp, field, request.data[field])
            mp.save()
            return Response({'success': True})
        except MaterialPrice.DoesNotExist:
            return Response({'error': 'Price not found'}, status=404)

    def delete(self, request, pk=None):
        if not pk:
            return Response({'error': 'Price ID required'}, status=400)
        try:
            MaterialPrice.objects.get(pk=pk).delete()
            return Response({'success': True})
        except MaterialPrice.DoesNotExist:
            return Response({'error': 'Price not found'}, status=404)

    @staticmethod
    def _serialize(mp):
        return {
            'id': mp.id,
            'material': mp.material,
            'unit': mp.unit,
            'price': str(mp.price),
            'currency': mp.currency,
            'region': mp.region,
            'supplier_name': mp.supplier_name,
            'notes': mp.notes,
            'updated_at': mp.updated_at.isoformat() if mp.updated_at else None,
            'created_at': mp.created_at.isoformat() if mp.created_at else None,
        }


# ── Site Intelligence (Project) ─────────────────────────────────────

class SiteIntelView(APIView):
    """Generate and fetch site intelligence for a project."""
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=404)

        if not (request.user.is_staff or project.owner_id == request.user.id):
            return Response({'error': 'Not authorized for this project'}, status=403)

        intel = SiteIntel.objects.filter(project=project).order_by('-created_at').first()
        if not intel:
            return Response({'error': 'No site intel found'}, status=404)

        return Response({
            'id': intel.id,
            'project': project.id,
            'summary': intel.summary,
            'rows': intel.rows,
            'raw_response': intel.raw_response,
            'source': intel.source,
            'created_at': intel.created_at.isoformat(),
        })

    def post(self, request):
        project_id = request.data.get('project_id')
        prompt_override = request.data.get('prompt')

        if not project_id:
            return Response({'error': 'project_id is required'}, status=400)
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=404)

        if not (request.user.is_staff or project.owner_id == request.user.id):
            return Response({'error': 'Not authorized for this project'}, status=403)

        instruction_obj = AIInstruction.objects.filter(is_active=True).first()
        base_instruction = instruction_obj.instruction_text if instruction_obj else (
            "You are the DzeNhare Architecture AI, a helpful, professional AI assistant "
            "built into the builder dashboard. You specialize in construction, compliance "
            "regulations (like SI-56), and architectural guidance. Keep answers concise, "
            "helpful, and professional."
        )

        system_content = base_instruction + (
            "\n\nCRITICAL INSTRUCTION: You are generating SITE INTELLIGENCE. "
            "You MUST perform active research using the provided tools (e.g., search, maps, weather) "
            "to gather real-world data about the project location. "
            "Discover and use the available MCP tools to find nearby amenities, "
            "neighborhood trends, and any local building regulations or zoning info.\n\n"
            "Respond ONLY with a JSON object matching this schema:\n"
            "{\n"
            "  'summary': 'Detailed executive summary of findings',\n"
            "  'insights': [\n"
            "    { 'aspect': 'Category (e.g. Neighborhood, Transport, Compliance)', 'finding': 'Specific fact', 'risk': 'Potential issue', 'recommendation': 'Actionable advice' }\n"
            "  ]\n"
            "}\n"
            "No markdown, no conversation. Be specific and fact-based."
        )

        prompt = prompt_override or _build_site_intel_prompt(project)

        try:
            response_content = _call_gemini_with_tools(
                messages=[{"role": "user", "content": prompt}],
                system=system_content,
                temperature=0.3,
            )
        except Exception as e:
            logger.exception("Site intel generation failed")
            return Response({'error': str(e)}, status=502)

        parsed = _parse_site_intel_response(response_content or "")
        candidate_rows = (
            parsed.get('insights')
            or parsed.get('rows')
            or parsed.get('data')
            or parsed.get('table')
            or []
        )
        normalized_rows = []
        if isinstance(candidate_rows, list):
            for row in candidate_rows:
                normalized_rows.append({
                    'aspect': row.get('aspect') or row.get('category') or row.get('topic') or '',
                    'finding': row.get('finding') or row.get('detail') or row.get('summary') or '',
                    'risk': row.get('risk') or row.get('issue') or '',
                    'recommendation': row.get('recommendation') or row.get('action') or row.get('mitigation') or '',
                })

        summary = parsed.get('summary') or parsed.get('overview') or ''

        if not normalized_rows:
            return Response({'error': 'AI did not return structured site intel', 'raw': response_content}, status=502)

        intel = SiteIntel.objects.create(
            project=project,
            user=request.user,
            summary=summary,
            rows=normalized_rows,
            raw_response=response_content or '',
            source='ai',
        )

        return Response({
            'id': intel.id,
            'project': project.id,
            'summary': intel.summary,
            'rows': intel.rows,
            'raw_response': intel.raw_response,
            'created_at': intel.created_at.isoformat(),
        }, status=201)


# ── Draw Agent (Architectural Studio AI) ─────────────────────────────

from .prompts import DRAW_AGENT_SYSTEM as _DRAW_AGENT_SYSTEM


class DrawAgentView(APIView):
    """AI drawing agent: converts natural language to parametric floor-plan JSON."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'ai_chat'

    def post(self, request):
        prompt = (request.data.get('prompt') or '').strip()
        current_elements = request.data.get('current_elements', [])

        if not prompt:
            return Response({'error': 'prompt is required'}, status=400)

        # Build context about what's already on canvas
        context = ""
        if current_elements and len(current_elements) > 0:
            wall_count = sum(1 for e in current_elements if e.get('layer') == 'Walls')
            door_count = sum(1 for e in current_elements if e.get('layer') == 'Doors')
            window_count = sum(1 for e in current_elements if e.get('layer') == 'Windows')
            context = (
                f"\n\nThe canvas currently has {len(current_elements)} elements "
                f"({wall_count} walls, {door_count} doors, {window_count} windows). "
                f"The user wants to ADD to or MODIFY the existing drawing. "
                f"Return ONLY the NEW elements to add, not the existing ones."
            )

        user_message = f"{prompt}{context}"

        try:
            raw = _call_gemini(
                messages=[{"role": "user", "content": user_message}],
                system=_DRAW_AGENT_SYSTEM,
                max_tokens=16384,
                temperature=0.4,
                timeout=180.0,
            )

            # Strip markdown fences if present
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                first_nl = cleaned.index("\n")
                cleaned = cleaned[first_nl + 1:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            try:
                plan = json.loads(cleaned)
            except json.JSONDecodeError:
                plan = _repair_truncated_json(cleaned)

            # Ensure summary exists
            if 'summary' not in plan:
                plan['summary'] = f"Generated from: {prompt[:100]}"

            return Response(plan)

        except Exception as e:
            logger.error("DrawAgent error: %s", e, exc_info=True)
            return Response(
                {'error': f'AI generation failed: {str(e)}'},
                status=502,
            )


# ── Draft Copilot (Pascal Architectural Drafter) ─────────────────────

_DRAFT_COPILOT_SYSTEM_PROMPT = (
    "You are OpenClaw, an expert AI architectural drafter for a parametric 3D building engine. "
    "The user describes a structure and you produce a precise JSON blueprint.\n\n"

    "## CRITICAL RULES\n"
    "1. Generate EXACTLY the number of rooms the user asks for. If they say '3-room house', "
    "produce exactly 3 rooms. Do NOT add extra rooms (no corridors, no entrance halls) unless "
    "the user explicitly asks for them.\n"
    "1b. Support residential AND commercial requests, including multi-storey buildings. "
    "For commercial briefs (office, retail, school, clinic, mixed-use), include realistic room types "
    "like reception, lobby, office, meeting_room, shop, corridor, restroom, storage, stairs, elevator_lobby.\n"
    "2. Coordinate origin is [0, 0]. X = east, Z = south. Units = meters.\n"
    "3. Room origins are the TOP-LEFT corner [x, z]. Rooms MUST tile perfectly — "
    "adjacent rooms share exact wall coordinates. NO gaps, NO overlaps.\n"
    "4. DOOR PLACEMENT: offset = distance in meters from wall start to the door CENTER. "
    "Prefer interior/shared walls for internal room circulation, and use an exterior wall only for "
    "main entry/exit doors. Keep door center clear of corners using this rule: "
    "offset must be >= max(0.3, door_width/2 + 0.1) and <= (wall_length - max(0.3, door_width/2 + 0.1)). "
    "Each room needs exactly 1 door unless user explicitly asks otherwise.\n"
    "5. WINDOW PLACEMENT: place windows on exterior walls only. "
    "Use the same corner-clearance rule as doors with window width. "
    "Bedrooms and living rooms: 1-2 windows. Kitchens: 1 window. Bathrooms: 0 windows by default.\n"
    "6. OPENING DIMENSIONS: use realistic dimensions in meters. "
    "Doors width 0.8-1.0 (bathroom 0.75-0.85), door height ~2.1. "
    "Windows width 0.6-1.8, height 0.9-1.5, sill_height 0.8-1.0.\n"
    "7. MULTI-STOREY: If user asks for multi-storey, set floors >= 2 and assign each room a floor index "
    "(1-based). Keep vertically stacked footprints aligned where sensible.\n"
    "8. Room sizes (realistic):\n"
    "   - Bedroom: 3.5×4.0m\n"
    "   - Living room: 5.0×4.5m\n"
    "   - Kitchen: 3.0×3.5m\n"
    "   - Bathroom: 2.0×2.5m\n"
    "9. Wall height: 2.8m.\n"
    "10. roof_type: choose 'hip' for houses, 'flat' for commercial by default unless user says otherwise.\n\n"

    "## JSON SCHEMA (respond with ONLY this, nothing else)\n"
    "{\n"
    '  "draft_name": "<string>",\n'
    '  "building_type": "<residential|commercial|mixed_use|industrial>",\n'
    '  "floors": <integer >= 1>,\n'
    '  "roof_type": "<hip|gable|shed|flat>",\n'
    '  "wall_height": 2.8,\n'
    '  "rooms": [\n'
    "    {\n"
    '      "id": "<snake_case>",\n'
    '      "type": "<living|bedroom|bathroom|kitchen|corridor|garage|dining|laundry|study|office|meeting_room|reception|lobby|shop|restroom|storage|stairs|elevator_lobby>",\n'
    '      "dimensions": { "width": <number>, "depth": <number> },\n'
    '      "origin": [<x>, <z>],\n'
      '      "floor": <integer >= 1>,\n'
    '      "doors": [{ "wall": "<north|south|east|west>", "offset": <number> }],\n'
    '      "windows": [{ "wall": "<north|south|east|west>", "offset": <number> }]\n'
    "    }\n"
    "  ]\n"
    "}\n"
    "Respond with ONLY the JSON. No text before or after.\n\n"
    "## HIGH-ACCURACY EXAMPLES\n"
    "Example A (residential, 1 floor):\n"
    "{"
    "\"draft_name\":\"Compact Family House\","
    "\"building_type\":\"residential\","
    "\"floors\":1,"
    "\"roof_type\":\"hip\","
    "\"wall_height\":2.8,"
    "\"rooms\":["
    "{\"id\":\"living\",\"type\":\"living\",\"dimensions\":{\"width\":5.0,\"depth\":4.5},\"origin\":[0,0],\"floor\":1,"
    "\"doors\":[{\"wall\":\"south\",\"offset\":2.5,\"width\":0.9}],"
    "\"windows\":[{\"wall\":\"north\",\"offset\":2.5,\"width\":1.5},{\"wall\":\"west\",\"offset\":2.2,\"width\":1.2}]},"
    "{\"id\":\"kitchen\",\"type\":\"kitchen\",\"dimensions\":{\"width\":3.5,\"depth\":3.5},\"origin\":[5.0,0],\"floor\":1,"
    "\"doors\":[{\"wall\":\"west\",\"offset\":1.75,\"width\":0.9}],"
    "\"windows\":[{\"wall\":\"north\",\"offset\":1.75,\"width\":1.2}]},"
    "{\"id\":\"bedroom_1\",\"type\":\"bedroom\",\"dimensions\":{\"width\":3.5,\"depth\":4.0},\"origin\":[0,4.5],\"floor\":1,"
    "\"doors\":[{\"wall\":\"north\",\"offset\":1.75,\"width\":0.9}],"
    "\"windows\":[{\"wall\":\"south\",\"offset\":1.75,\"width\":1.2}]},"
    "{\"id\":\"bathroom\",\"type\":\"bathroom\",\"dimensions\":{\"width\":2.5,\"depth\":2.0},\"origin\":[3.5,4.5],\"floor\":1,"
    "\"doors\":[{\"wall\":\"north\",\"offset\":1.25,\"width\":0.8}],"
    "\"windows\":[]}"
    "]"
    "}\n"
    "Example B (commercial, 3 floors):\n"
    "{"
    "\"draft_name\":\"Midrise Office Block\","
    "\"building_type\":\"commercial\","
    "\"floors\":3,"
    "\"roof_type\":\"flat\","
    "\"wall_height\":3.2,"
    "\"rooms\":["
    "{\"id\":\"lobby_f1\",\"type\":\"lobby\",\"dimensions\":{\"width\":8.0,\"depth\":6.0},\"origin\":[0,0],\"floor\":1,"
    "\"doors\":[{\"wall\":\"south\",\"offset\":4.0,\"width\":1.2}],"
    "\"windows\":[{\"wall\":\"north\",\"offset\":4.0,\"width\":1.8}]},"
    "{\"id\":\"reception_f1\",\"type\":\"reception\",\"dimensions\":{\"width\":4.0,\"depth\":3.0},\"origin\":[8.0,0],\"floor\":1,"
    "\"doors\":[{\"wall\":\"west\",\"offset\":1.5,\"width\":0.9}],"
    "\"windows\":[{\"wall\":\"north\",\"offset\":2.0,\"width\":1.2}]},"
    "{\"id\":\"office_open_f2\",\"type\":\"office\",\"dimensions\":{\"width\":8.0,\"depth\":6.0},\"origin\":[0,0],\"floor\":2,"
    "\"doors\":[{\"wall\":\"south\",\"offset\":4.0,\"width\":1.0}],"
    "\"windows\":[{\"wall\":\"north\",\"offset\":4.0,\"width\":1.8},{\"wall\":\"east\",\"offset\":3.0,\"width\":1.5}]},"
    "{\"id\":\"meeting_f2\",\"type\":\"meeting_room\",\"dimensions\":{\"width\":4.0,\"depth\":3.5},\"origin\":[8.0,0],\"floor\":2,"
    "\"doors\":[{\"wall\":\"west\",\"offset\":1.75,\"width\":0.9}],"
    "\"windows\":[{\"wall\":\"north\",\"offset\":2.0,\"width\":1.2}]},"
    "{\"id\":\"office_open_f3\",\"type\":\"office\",\"dimensions\":{\"width\":8.0,\"depth\":6.0},\"origin\":[0,0],\"floor\":3,"
    "\"doors\":[{\"wall\":\"south\",\"offset\":4.0,\"width\":1.0}],"
    "\"windows\":[{\"wall\":\"north\",\"offset\":4.0,\"width\":1.8},{\"wall\":\"west\",\"offset\":3.0,\"width\":1.5}]},"
    "{\"id\":\"restroom_f3\",\"type\":\"restroom\",\"dimensions\":{\"width\":3.0,\"depth\":2.5},\"origin\":[8.0,0],\"floor\":3,"
    "\"doors\":[{\"wall\":\"west\",\"offset\":1.25,\"width\":0.85}],"
    "\"windows\":[]}"
    "]"
    "}\n"
    "Example C (mixed-use, 2 floors):\n"
    "{"
    "\"draft_name\":\"Corner Mixed Use\","
    "\"building_type\":\"mixed_use\","
    "\"floors\":2,"
    "\"roof_type\":\"flat\","
    "\"wall_height\":3.0,"
    "\"rooms\":["
    "{\"id\":\"shop_front_f1\",\"type\":\"shop\",\"dimensions\":{\"width\":6.0,\"depth\":5.0},\"origin\":[0,0],\"floor\":1,"
    "\"doors\":[{\"wall\":\"south\",\"offset\":3.0,\"width\":1.2}],"
    "\"windows\":[{\"wall\":\"south\",\"offset\":1.2,\"width\":1.2},{\"wall\":\"south\",\"offset\":4.8,\"width\":1.2}]},"
    "{\"id\":\"storage_f1\",\"type\":\"storage\",\"dimensions\":{\"width\":3.0,\"depth\":3.0},\"origin\":[6.0,0],\"floor\":1,"
    "\"doors\":[{\"wall\":\"west\",\"offset\":1.5,\"width\":0.9}],"
    "\"windows\":[{\"wall\":\"north\",\"offset\":1.5,\"width\":1.0}]},"
    "{\"id\":\"corridor_f1\",\"type\":\"corridor\",\"dimensions\":{\"width\":2.0,\"depth\":5.0},\"origin\":[9.0,0],\"floor\":1,"
    "\"doors\":[{\"wall\":\"west\",\"offset\":2.5,\"width\":0.9}],"
    "\"windows\":[]},"
    "{\"id\":\"stairs_f1\",\"type\":\"stairs\",\"dimensions\":{\"width\":2.0,\"depth\":3.0},\"origin\":[9.0,5.0],\"floor\":1,"
    "\"doors\":[{\"wall\":\"north\",\"offset\":1.0,\"width\":0.9}],"
    "\"windows\":[]},"
    "{\"id\":\"living_f2\",\"type\":\"living\",\"dimensions\":{\"width\":5.0,\"depth\":4.0},\"origin\":[0,0],\"floor\":2,"
    "\"doors\":[{\"wall\":\"east\",\"offset\":2.0,\"width\":0.9}],"
    "\"windows\":[{\"wall\":\"north\",\"offset\":2.5,\"width\":1.5},{\"wall\":\"west\",\"offset\":2.0,\"width\":1.2}]},"
    "{\"id\":\"bedroom_f2\",\"type\":\"bedroom\",\"dimensions\":{\"width\":4.0,\"depth\":4.0},\"origin\":[5.0,0],\"floor\":2,"
    "\"doors\":[{\"wall\":\"west\",\"offset\":2.0,\"width\":0.9}],"
    "\"windows\":[{\"wall\":\"north\",\"offset\":2.0,\"width\":1.2}]},"
    "{\"id\":\"kitchen_f2\",\"type\":\"kitchen\",\"dimensions\":{\"width\":3.0,\"depth\":3.0},\"origin\":[0,4.0],\"floor\":2,"
    "\"doors\":[{\"wall\":\"north\",\"offset\":1.5,\"width\":0.9}],"
    "\"windows\":[{\"wall\":\"south\",\"offset\":1.5,\"width\":1.2}]},"
    "{\"id\":\"bathroom_f2\",\"type\":\"bathroom\",\"dimensions\":{\"width\":2.0,\"depth\":2.5},\"origin\":[3.0,4.0],\"floor\":2,"
    "\"doors\":[{\"wall\":\"north\",\"offset\":1.0,\"width\":0.8}],"
    "\"windows\":[]}"
    "]"
    "}\n"
    "Learn the pattern: valid wall names, realistic offsets, correct floor indices, and windows on exterior walls.\n\n"
    "## NEGATIVE EXAMPLES (avoid these)\n"
    "Bad: wall=\"northeast\" or floor=0 or missing floors/building_type.\n"
    "Good: wall in [north,south,east,west], floor starts at 1, include floors and building_type.\n"
    "Bad: bathroom windows auto-added, or offsets at wall corners (0.0 / wall_length).\n"
    "Good: bathrooms default to windows=[], and openings are corner-safe with clearances.\n"
    "Bad: interior windows on shared corridor walls in commercial plans.\n"
    "Good: place windows on exterior-facing walls unless user explicitly requests otherwise.\n"
    "Bad Output snippet:\n"
    "{\"rooms\":[{\"id\":\"r1\",\"type\":\"office\",\"origin\":[0,0],\"floor\":0,\"doors\":[{\"wall\":\"northeast\",\"offset\":0.0}],\"windows\":[{\"wall\":\"west\",\"offset\":0.0}]}]}\n"
    "Corrected snippet:\n"
    "{\"building_type\":\"commercial\",\"floors\":2,\"rooms\":[{\"id\":\"office_f1\",\"type\":\"office\",\"dimensions\":{\"width\":6.0,\"depth\":4.0},\"origin\":[0,0],\"floor\":1,\"doors\":[{\"wall\":\"south\",\"offset\":3.0,\"width\":0.9}],\"windows\":[{\"wall\":\"north\",\"offset\":3.0,\"width\":1.2}]}]}"
)

def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _normalize_draft_openings(draft: Dict[str, Any]) -> Dict[str, Any]:
    rooms = draft.get('rooms')
    if not isinstance(rooms, list):
        return draft
    total_floors = draft.get('floors')
    if not isinstance(total_floors, int) or total_floors < 1:
        inferred = max(
            1,
            *[
                int(room.get('floor'))
                for room in rooms
                if isinstance(room, dict) and isinstance(room.get('floor'), (int, float))
            ],
        )
        total_floors = inferred
    draft['floors'] = max(1, min(60, int(total_floors)))

    building_type = str(draft.get('building_type') or '').lower()
    if building_type not in {'residential', 'commercial', 'mixed_use', 'industrial'}:
        commercial_tokens = ('office', 'retail', 'commercial', 'mall', 'school', 'clinic', 'hospital')
        text_blob = json.dumps(draft).lower()
        draft['building_type'] = 'commercial' if any(token in text_blob for token in commercial_tokens) else 'residential'
    if not isinstance(draft.get('roof_type'), str):
        draft['roof_type'] = 'flat' if draft['building_type'] in {'commercial', 'industrial', 'mixed_use'} else 'hip'

    for room in rooms:
        if not isinstance(room, dict):
            continue
        floor_raw = room.get('floor')
        floor_value = int(floor_raw) if isinstance(floor_raw, (int, float)) else 1
        room['floor'] = max(1, min(draft['floors'], floor_value))
        dimensions = room.get('dimensions') if isinstance(room.get('dimensions'), dict) else {}
        width = float(dimensions.get('width') or 0)
        depth = float(dimensions.get('depth') or 0)
        room_type = str(room.get('type') or '').lower()

        def wall_length(wall_name: str) -> float:
            return width if wall_name in ('north', 'south') else depth

        def normalize_wall(raw: Any) -> str:
            return raw if raw in ('north', 'south', 'east', 'west') else 'south'

        doors = room.get('doors') if isinstance(room.get('doors'), list) else []
        if not doors:
            doors = [{'wall': 'south', 'offset': max(0.6, wall_length('south') / 2)}]
        normalized_doors = []
        for door in doors:
            if not isinstance(door, dict):
                continue
            wall = normalize_wall(door.get('wall'))
            length = max(1.0, wall_length(wall))
            default_width = 0.8 if room_type == 'bathroom' else 0.9
            door_width = door.get('width')
            door_width = float(door_width) if isinstance(door_width, (int, float)) else default_width
            door_width = _clamp(door_width, 0.7, min(2.4, length * 0.7))
            clearance = max(0.3, door_width / 2 + 0.1)
            min_offset = min(clearance, length / 2)
            max_offset = max(min_offset, length - clearance)
            raw_offset = door.get('offset')
            offset = float(raw_offset) if isinstance(raw_offset, (int, float)) else length / 2
            normalized_doors.append({
                **door,
                'wall': wall,
                'width': door_width,
                'height': _clamp(float(door.get('height')) if isinstance(door.get('height'), (int, float)) else 2.1, 1.9, 2.5),
                'offset': _clamp(offset, min_offset, max_offset),
            })
        room['doors'] = normalized_doors[:4]

        windows = room.get('windows') if isinstance(room.get('windows'), list) else []
        if room_type != 'bathroom' and not windows:
            windows = [{'wall': 'north', 'offset': max(0.6, wall_length('north') / 2)}]
        normalized_windows = []
        for win in windows:
            if not isinstance(win, dict):
                continue
            wall = normalize_wall(win.get('wall'))
            length = max(1.0, wall_length(wall))
            win_width = float(win.get('width')) if isinstance(win.get('width'), (int, float)) else (0.6 if room_type == 'bathroom' else 1.2)
            win_width = _clamp(win_width, 0.45, min(2.4, length * 0.7))
            clearance = max(0.3, win_width / 2 + 0.1)
            min_offset = min(clearance, length / 2)
            max_offset = max(min_offset, length - clearance)
            raw_offset = win.get('offset')
            offset = float(raw_offset) if isinstance(raw_offset, (int, float)) else length / 2
            normalized_windows.append({
                **win,
                'wall': wall,
                'width': win_width,
                'height': _clamp(float(win.get('height')) if isinstance(win.get('height'), (int, float)) else 1.2, 0.7, 1.8),
                'sill_height': _clamp(float(win.get('sill_height')) if isinstance(win.get('sill_height'), (int, float)) else 0.9, 0.5, 1.1),
                'offset': _clamp(offset, min_offset, max_offset),
            })
        room['windows'] = [] if room_type == 'bathroom' and not room.get('windows') else normalized_windows[:4]

    return draft


def _call_gemini_json(system: str, user_content: str, max_tokens: int = 8192,
                      temperature: float = 0.4, timeout: float = 90.0) -> str:
    """Call Gemini with responseMimeType=application/json for structured output."""
    api_key = settings.GEMINI_API_KEY
    if not api_key or len(api_key) < 10:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    model_name = getattr(settings, 'AI_DRAFT_MODEL', '') or 'gemini-3.1-pro-preview'
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}"
        f":generateContent?key={api_key}"
    )

    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": f"{system}\n\n{user_content}"}]}
        ],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
            "responseMimeType": "application/json",
        },
    }

    logger.info("[Gemini JSON] Calling %s for draft-copilot", model_name)
    try:
        resp = http_requests.post(url, json=payload, timeout=timeout)
    except http_requests.exceptions.Timeout:
        raise RuntimeError("Gemini timed out. Try a simpler prompt.")
    except http_requests.exceptions.RequestException as e:
        raise RuntimeError(f"Could not connect to Gemini: {e}")

    if resp.status_code != 200:
        body = resp.text[:600]
        raise RuntimeError(f"Gemini API error (HTTP {resp.status_code}): {body}")

    data = resp.json()
    candidates = data.get("candidates", [])
    if not candidates:
        raise RuntimeError("Gemini returned no candidates.")

    parts = candidates[0].get("content", {}).get("parts", [])
    text_parts = [p["text"] for p in parts if "text" in p]
    return "\n".join(text_parts)


class DraftCopilotView(APIView):
    """
    POST /api/v1/ai/draft-copilot/
    Accepts { "prompt": "Build a 3-bedroom house" }
    Returns the Parametric OOP JSON draft from Gemini.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'ai_generate'

    def post(self, request):
        prompt = (request.data.get('prompt') or request.data.get('input') or '').strip()
        if not prompt:
            return Response({'error': 'prompt is required'}, status=400)

        try:
            raw = _call_gemini_json(
                system=_DRAFT_COPILOT_SYSTEM_PROMPT,
                user_content=prompt,
                max_tokens=8192,
                temperature=0.4,
                timeout=90.0,
            )

            cleaned = raw.strip()
            if cleaned.startswith("```"):
                first_nl = cleaned.index("\n")
                cleaned = cleaned[first_nl + 1:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            try:
                draft = json.loads(cleaned)
            except json.JSONDecodeError:
                draft = _repair_truncated_json(cleaned)

            if 'rooms' not in draft or not isinstance(draft.get('rooms'), list):
                return Response(
                    {'error': 'Gemini returned invalid draft structure (missing rooms array).'},
                    status=502,
                )

            if 'draft_name' not in draft:
                draft['draft_name'] = f"Draft: {prompt[:60]}"

            draft = _normalize_draft_openings(draft)

            return Response(draft)

        except Exception as e:
            logger.error("DraftCopilot error: %s", e, exc_info=True)
            return Response(
                {'error': f'AI drafting failed: {str(e)}'},
                status=502,
            )
