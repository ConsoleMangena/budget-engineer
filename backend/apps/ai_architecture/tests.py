"""
Unit tests for the AI Architecture module.
Covers tool functions, Pydantic schemas, and mocked view behaviour.
"""
import json
from unittest.mock import patch, MagicMock
from django.test import TestCase, RequestFactory
from django.contrib.auth.models import User
from pydantic import ValidationError

from .views import (
    _get_material_prices,
    _check_compliance,
    _calculate_area,
    BOQItem,
    BOQAnalysis,
)
from .models import MaterialPrice, TokenUsage, ChatSession


# ── Tool function tests ──────────────────────────────────────────────

class MaterialPricesToolTest(TestCase):
    """Tests for _get_material_prices (DB-backed + static fallback)."""

    def test_static_fallback_known_material(self):
        result = _get_material_prices("cement")
        self.assertTrue(result["found"])
        self.assertIn("cement", result["material"])

    def test_static_fallback_unknown_material(self):
        result = _get_material_prices("unobtanium")
        self.assertFalse(result["found"])

    def test_db_lookup_takes_precedence(self):
        MaterialPrice.objects.create(
            material="cement", unit="50kg bag", price=15.00,
            currency="USD", region="Zimbabwe",
        )
        result = _get_material_prices("cement", "Zimbabwe")
        self.assertTrue(result["found"])
        self.assertIn("prices", result)
        self.assertEqual(float(result["prices"][0]["price"]), 15.00)


class ComplianceToolTest(TestCase):
    """Tests for _check_compliance."""

    def test_known_aspect(self):
        result = _check_compliance("residential", "bedroom")
        self.assertTrue(result["found"])
        self.assertGreater(len(result["rules"]), 0)

    def test_unknown_aspect(self):
        result = _check_compliance("residential", "swimming_pool")
        self.assertFalse(result["found"])


class AreaCalculationToolTest(TestCase):
    """Tests for _calculate_area."""

    def test_rectangle(self):
        result = _calculate_area("rectangle", {"length": 10, "width": 5})
        self.assertEqual(result["area_m2"], 50.0)

    def test_circle(self):
        result = _calculate_area("circle", {"radius": 1})
        self.assertAlmostEqual(result["area_m2"], 3.14, places=2)

    def test_triangle(self):
        result = _calculate_area("triangle", {"base": 6, "height": 4})
        self.assertEqual(result["area_m2"], 12.0)

    def test_cuboid_volume(self):
        result = _calculate_area("cuboid", {"length": 2, "width": 3, "height": 4})
        self.assertEqual(result["volume_m3"], 24.0)

    def test_unknown_shape(self):
        result = _calculate_area("hexagon", {"side": 3})
        self.assertIn("error", result)


# ── Pydantic schema tests ────────────────────────────────────────────

class BOQSchemaTest(TestCase):
    """Tests for BOQItem and BOQAnalysis Pydantic models."""

    def test_valid_boq_item(self):
        item = BOQItem(
            category="Substructure",
            item_name="Foundation Concrete",
            description="C25 concrete for strip foundations",
            unit="m³",
            quantity=12.5,
            rate=120.0,
            total_amount=1500.0,
        )
        self.assertEqual(item.total_amount, 1500.0)

    def test_boq_item_missing_field(self):
        with self.assertRaises(ValidationError):
            BOQItem(category="Sub", item_name="X", description="Y", unit="m²", quantity=1)

    def test_valid_boq_analysis(self):
        analysis = BOQAnalysis(
            summary="Test analysis",
            items=[
                BOQItem(
                    category="Superstructure", item_name="Bricks",
                    description="Face bricks", unit="1000 nr",
                    quantity=5, rate=150, total_amount=750,
                )
            ],
            compliance_notes=["Wall thickness OK"],
            recommendations=["Get 3 quotes"],
        )
        self.assertEqual(len(analysis.items), 1)
        self.assertEqual(analysis.items[0].total_amount, 750)


# ── Model tests ──────────────────────────────────────────────────────

class TokenUsageModelTest(TestCase):
    """Tests for TokenUsage auto-total calculation."""

    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="pass")

    def test_total_tokens_computed_on_save(self):
        t = TokenUsage.objects.create(
            user=self.user, endpoint="chat",
            model_name="claude-sonnet-4-20250514",
            input_tokens=100, output_tokens=50,
        )
        self.assertEqual(t.total_tokens, 150)

    def test_zero_defaults(self):
        t = TokenUsage.objects.create(user=self.user, endpoint="stream")
        self.assertEqual(t.total_tokens, 0)



class MaterialPriceModelTest(TestCase):
    """Tests for MaterialPrice model."""

    def test_create_and_str(self):
        p = MaterialPrice.objects.create(
            material="cement", unit="50kg bag",
            price=12.50, currency="USD", region="Zimbabwe",
        )
        self.assertIn("cement", str(p))
        self.assertIn("12.5", str(p))
