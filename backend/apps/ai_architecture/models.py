from django.db import models
from apps.core.models import TimeStampedModel
from apps.builder_dashboard.models import Project
from django.conf import settings

class KnowledgeDocument(TimeStampedModel):
    """
    RAG Knowledge Base Documents
    """
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='knowledge_base/')
    content_hash = models.CharField(
        max_length=64, blank=True, default='',
        db_index=True,
        help_text="SHA-256 hash of file content for deduplication"
    )
    is_embedded = models.BooleanField(default=False, help_text="True if successfully processed into ChromaDB")
    uploaded_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Knowledge Document'
        verbose_name_plural = 'Knowledge Documents'
        
    def __str__(self):
        return self.title

class AIInstruction(TimeStampedModel):
    """
    Stores the system prompt instructions for the AI architecture assistant.
    Expected to be a singleton (only one row).
    """
    instruction_text = models.TextField(
        default="You are the DzeNhare Architecture AI, a helpful, professional AI assistant built into the builder dashboard. You specialize in construction, compliance regulations (like SI-56), and architectural guidance. Keep answers concise, helpful, and professional.",
        help_text="The system prompt instructing the AI how to behave and what its role is."
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'AI Instruction Configuration'
        verbose_name_plural = 'AI Instruction Configurations'

    def __str__(self):
        return "System Prompt Configuration"

class ChatSession(TimeStampedModel):
    """
    Represents an ongoing chat conversation with the AI for a specific user.
    """
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='chat_sessions')
    title = models.CharField(max_length=255, default="New Chat")

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Chat Session'
        verbose_name_plural = 'Chat Sessions'

    def __str__(self):
        return f"{self.user.username} - {self.title}"


class ChatMessage(TimeStampedModel):
    """
    Represents an individual message within a ChatSession.
    """
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]
    
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    image_url = models.URLField(max_length=500, blank=True, null=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Chat Message'
        verbose_name_plural = 'Chat Messages'

    def __str__(self):
        return f"[{self.session.id}] {self.role}: {self.content[:50]}"





class MaterialPrice(TimeStampedModel):
    """
    Real material pricing data — queried by the _get_material_prices tool.
    Admins can update prices via Django admin.
    """
    CURRENCY_CHOICES = [
        ('USD', 'US Dollar'),
        ('ZWL', 'Zimbabwe Dollar'),
        ('ZAR', 'South African Rand'),
    ]

    material = models.CharField(max_length=120, db_index=True, help_text="e.g. cement, river sand, roofing sheets")
    unit = models.CharField(max_length=50, help_text="e.g. 50kg bag, m³, sheet")
    price = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='USD')
    region = models.CharField(max_length=100, default='Zimbabwe', db_index=True)
    supplier_name = models.CharField(max_length=200, blank=True, default='')
    notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['material', 'region']
        unique_together = ['material', 'region', 'supplier_name']
        verbose_name = 'Material Price'
        verbose_name_plural = 'Material Prices'

    def __str__(self):
        return f"{self.material} — {self.price} {self.currency}/{self.unit} ({self.region})"


class TokenUsage(TimeStampedModel):
    """
    Tracks AI token consumption per request for cost monitoring & analytics.
    """
    ENDPOINT_CHOICES = [
        ('chat', 'Chat Completion'),
        ('stream', 'Chat Stream'),
        ('analyse', 'BOQ Analyse'),
        ('draw', 'Image Generation'),
        ('tools', 'Tool Use'),
    ]

    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='token_usage')
    session = models.ForeignKey(ChatSession, on_delete=models.SET_NULL, null=True, blank=True)
    endpoint = models.CharField(max_length=20, choices=ENDPOINT_CHOICES, default='chat')
    model_name = models.CharField(max_length=80, default='')
    input_tokens = models.PositiveIntegerField(default=0)
    output_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Token Usage'
        verbose_name_plural = 'Token Usage Records'
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['endpoint', '-created_at']),
        ]

    def save(self, *args, **kwargs):
        self.total_tokens = self.input_tokens + self.output_tokens
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} | {self.endpoint} | {self.total_tokens} tokens"


class SiteIntel(TimeStampedModel):
    """
    Stores structured site intelligence generated by the AI for a project.
    Persisted so dashboards can render and export without re-calling the AI.
    """
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='site_intel_records')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='site_intel_requests')
    summary = models.TextField(blank=True, default='')
    rows = models.JSONField(default=list, help_text="Array of {aspect, finding, risk, recommendation}")
    raw_response = models.TextField(blank=True, default='')
    source = models.CharField(max_length=20, default='ai')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Site Intelligence'
        verbose_name_plural = 'Site Intelligence Records'

    def __str__(self):
        return f"Site Intel for {self.project.title} ({self.created_at.date()})"


class DrawingStylePreset(TimeStampedModel):
    """
    Configurable drawing style presets for AI image generation.
    Controls prompt engineering parameters for different architectural styles.
    """
    name = models.CharField(max_length=120, help_text="Preset name, e.g. 'Modern Minimalist'")
    is_active = models.BooleanField(default=True)
    priority = models.IntegerField(default=0, help_text="Higher priority presets are matched first")
    keywords = models.TextField(
        blank=True, default='',
        help_text="Comma-separated keywords that trigger this preset (e.g. 'modern, minimalist, clean')"
    )
    prompt_prefix = models.TextField(
        blank=True, default='',
        help_text="Text prepended to the image generation prompt when this preset matches"
    )
    prompt_suffix = models.TextField(
        blank=True, default='',
        help_text="Text appended to the image generation prompt when this preset matches"
    )
    negative_prompt = models.TextField(
        blank=True, default='',
        help_text="Negative prompt additions for this style"
    )
    guidance_scale = models.FloatField(default=12.0, help_text="CFG guidance scale for image generation")

    class Meta:
        ordering = ['-priority', 'name']
        verbose_name = 'Drawing Style Preset'
        verbose_name_plural = 'Drawing Style Presets'

    def __str__(self):
        return f"{self.name} {'(active)' if self.is_active else ''}"

    def get_keywords_list(self) -> list:
        return [k.strip().lower() for k in self.keywords.split(',') if k.strip()]


class ImageFeedback(TimeStampedModel):
    """
    Stores user feedback on AI-generated images for quality improvement.
    High-rated prompts are used as few-shot examples for future generations.
    """
    message = models.ForeignKey(ChatMessage, on_delete=models.CASCADE, related_name='image_feedback')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='image_feedback')
    rating = models.IntegerField(help_text="1-5 star rating")
    original_prompt = models.TextField(blank=True, default='')
    preset_used = models.ForeignKey(
        DrawingStylePreset, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='feedback'
    )
    feedback_text = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-created_at']
        unique_together = [('message', 'user')]
        verbose_name = 'Image Feedback'
        verbose_name_plural = 'Image Feedback'

    def __str__(self):
        return f"Feedback by {self.user.username} — {self.rating}★"


class BOQTemplate(TimeStampedModel):
    """
    Admin-configurable BOQ format template.
    Controls how the AI structures extracted BOQ data — category ordering,
    column layout, example items, and extraction rules.

    Expected to be a singleton: the active template is loaded into the /analyse
    system prompt so Claude follows the user's preferred format.
    """
    name = models.CharField(
        max_length=120,
        default="Default BOQ Format",
        help_text="Display name for this template."
    )
    is_active = models.BooleanField(default=True)

    # ── Category ordering ──
    category_order = models.TextField(
        default=(
            "1. Preliminaries\n"
            "2. Substructure\n"
            "3. Superstructure — Walling\n"
            "4. Superstructure — Roofing\n"
            "5. Finishes — Internal\n"
            "6. Finishes — External\n"
            "7. Windows & Doors\n"
            "8. Plumbing & Drainage\n"
            "9. Electrical\n"
            "10. External Works\n"
            "11. Provisional Sums & Contingencies"
        ),
        help_text=(
            "Numbered list of BOQ categories in the order they must appear. "
            "The AI will group extracted items under these headings."
        )
    )

    # ── Extraction rules ──
    extraction_rules = models.TextField(
        default=(
            "• Examine the drawing meticulously — identify ALL distinct elements that require quantification.\n"
            "• For each element, extract or calculate dimensions (length × width × height/depth as applicable).\n"
            "• Always include Preliminaries (site establishment, water supply, temporary works, setting out).\n"
            "• For walls: distinguish external load-bearing (230 mm) vs internal partition (115 mm). "
            "Calculate wall area = perimeter × height minus openings. Measure in m².\n"
            "• For concrete: separate strip foundations, floor slabs, columns, lintels, ring beams. "
            "Calculate volume = L × W × D. Measure in m³.\n"
            "• For roofing: include roof covering (sheets/tiles), trusses/rafters, fascia boards, "
            "gutters, ceiling. Measure covering in m², timber in m.\n"
            "• For finishes: separate plaster, paint, screeds, tiling per room and per surface "
            "(walls vs floor vs ceiling). Measure in m².\n"
            "• For doors/windows: count per type with exact sizes (e.g. 813×2032 flush door, "
            "1500×1200 aluminium sliding). Include frames, ironmongery. Measure in nr.\n"
            "• For plumbing: list fixtures (WC, WHB, shower, sink) and pipework (110 mm soil, "
            "50 mm waste, 15 mm water). Measure fixtures in nr, pipes in m.\n"
            "• For electrical: list DB boards, circuits, light points, sockets, switches, "
            "earth leakage. Measure in nr.\n"
            "• Show the measurement formula for each item (e.g. '2×(12.5+8.0)×2.7 = 110.7 m²').\n"
            "• If a quantity can't be read from the plan, estimate it and append '(est.)' to the description.\n"
            "• Apply standard Zimbabwean rates (USD) unless a rate schedule is attached.\n"
            "• Present items in a logical construction sequence from ground up."
        ),
        help_text=(
            "Rules the AI must follow when extracting items from floor plans. "
            "Be specific about what to measure, how to categorize, and units."
        )
    )

    # ── Example items (few-shot) ──
    example_items_json = models.TextField(
        default='[\n'
        '  {"category": "Substructure", "item_name": "Strip Foundation Concrete (C25)", '
        '"description": "600×200 mm strip foundation trench concrete", "unit": "m³", '
        '"quantity": 8.5, "rate": 120.00, "total_amount": 1020.00},\n'
        '  {"category": "Superstructure — Walling", "item_name": "Face Brick External Walls (230 mm)", '
        '"description": "Double-skin face brick to external walls as per plan", "unit": "m²", '
        '"quantity": 145.0, "rate": 65.00, "total_amount": 9425.00},\n'
        '  {"category": "Superstructure — Roofing", "item_name": "IBR Roofing Sheets (0.47 mm)", '
        '"description": "Chromadek IBR profile roof covering on timber trusses", "unit": "m²", '
        '"quantity": 120.0, "rate": 18.50, "total_amount": 2220.00},\n'
        '  {"category": "Windows & Doors", "item_name": "Aluminium Sliding Window 1500×1200", '
        '"description": "Powder-coated aluminium sliding window, 6.38 mm laminated glass, supply & fit", '
        '"unit": "nr", "quantity": 6, "rate": 280.00, "total_amount": 1680.00}\n'
        ']',
        help_text=(
            "JSON array of example BOQ items. These are injected as few-shot examples "
            "so the AI learns your preferred naming, description style, and level of detail. "
            "Add/edit as many as you need."
        )
    )

    # ── Extra columns (optional) ──
    include_labour_rate = models.BooleanField(
        default=False,
        help_text="If True, the AI will separate material rate and labour rate per item."
    )
    include_measurement_formula = models.BooleanField(
        default=True,
        help_text="If True, the AI will show how it calculated each quantity (e.g. 2 × 4.5 × 2.7 = 24.3)."
    )

    # ── Custom header / footer text ──
    header_text = models.TextField(
        blank=True, default='',
        help_text="Optional text printed at the top of BOQ exports (e.g. company name, project title)."
    )
    footer_text = models.TextField(
        blank=True, default='',
        help_text="Optional text printed at the bottom (e.g. validity note, T&Cs)."
    )

    class Meta:
        ordering = ['-is_active', '-updated_at']
        verbose_name = 'BOQ Template'
        verbose_name_plural = 'BOQ Templates'

    def __str__(self):
        return f"{self.name} {'(active)' if self.is_active else ''}"

    def get_example_items(self) -> list:
        """Parse the example_items_json field, returning [] on error."""
        import json
        try:
            return json.loads(self.example_items_json)
        except (json.JSONDecodeError, TypeError):
            return []


