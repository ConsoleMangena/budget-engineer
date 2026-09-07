from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from apps.core.models import TimeStampedModel

class Project(TimeStampedModel):
    STATUS_CHOICES = [
        ('PLANNING', 'Planning'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('ON_HOLD', 'On Hold'),
    ]

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_projects')
    title = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, help_text="Project latitude")
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, help_text="Project longitude")
    budget = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PLANNING')
    si56_verified = models.BooleanField(default=False, help_text="Verified against SI 56 of 2025 (Registered Architects)")
    is_budget_signed = models.BooleanField(default=False, help_text="Indicates if the construction budget has been signed by the builder")
    
    ENGAGEMENT_TIER_CHOICES = [
        ('DIT', 'Do It Together'),
        ('DIFY', 'Do It For You'),
    ]
    engagement_tier = models.CharField(max_length=10, choices=ENGAGEMENT_TIER_CHOICES, default='DIT')
    ai_brief = models.TextField(blank=True, null=True, help_text="User-provided project summary/brief")
    
    architect = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_projects',
        help_text="Primary architect assigned to this project"
    )

    # Detailed program/brief fields
    building_type = models.CharField(max_length=50, blank=True, null=True)
    use_case = models.CharField(max_length=50, blank=True, null=True)
    occupants = models.PositiveIntegerField(blank=True, null=True)
    bedrooms = models.PositiveIntegerField(blank=True, null=True)
    bathrooms = models.PositiveIntegerField(blank=True, null=True)
    floors = models.PositiveIntegerField(blank=True, null=True)
    has_garage = models.BooleanField(blank=True, null=True)
    parking_spaces = models.PositiveIntegerField(blank=True, null=True)
    lot_size = models.CharField(max_length=100, blank=True, null=True, help_text="Lot size / site area")
    footprint = models.CharField(max_length=100, blank=True, null=True, help_text="Desired building footprint")
    preferred_style = models.CharField(max_length=50, blank=True, null=True)
    roof_type = models.CharField(max_length=50, blank=True, null=True)
    special_spaces = models.TextField(blank=True, null=True)
    sustainability = models.TextField(blank=True, null=True)
    accessibility = models.TextField(blank=True, null=True)
    site_notes = models.TextField(blank=True, null=True)
    constraints = models.TextField(blank=True, null=True)
    timeline = models.CharField(max_length=20, blank=True, null=True)
    budget_flex = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def preliminary_budget_version(self):
        """Working budget (corrections)."""
        return self.budget_versions.filter(kind='PRELIMINARY').first()

    def final_budget_version(self):
        """Signed-off budget snapshot."""
        return self.budget_versions.filter(kind='FINAL').first()

class SiteUpdate(TimeStampedModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='site_updates')
    description = models.TextField()
    image = models.ImageField(upload_to='site_updates/')
    geo_location = models.CharField(max_length=255, blank=True, null=True, help_text="Geo-tagged location")
    verified = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Update for {self.project.title} on {self.created_at.strftime('%Y-%m-%d')}"

class EscrowMilestone(TimeStampedModel):
    STATUS_CHOICES = [
        ('completed', 'Completed'),
        ('pending', 'Pending'),
        ('locked', 'Locked'),
    ]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='escrow_milestones')
    name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='locked')
    released = models.BooleanField(default=False)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.name} - ${self.amount}"

class CapitalSchedule(TimeStampedModel):
    STATUS_CHOICES = [
        ('paid', 'Paid'),
        ('upcoming', 'Upcoming'),
        ('overdue', 'Overdue'),
    ]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='capital_schedules')
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='upcoming')

    class Meta:
        ordering = ['due_date']

    def __str__(self):
        return f"{self.description} - ${self.amount} ({self.status})"

class MaterialAudit(TimeStampedModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='material_audits')
    material_name = models.CharField(max_length=255)
    delivered_qty = models.DecimalField(max_digits=12, decimal_places=2)
    installed_qty = models.DecimalField(max_digits=12, decimal_places=2)
    theoretical_usage = models.DecimalField(max_digits=12, decimal_places=2, help_text="Expected usage based on installed qty")
    actual_usage = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=50, default='units')
    audit_passed = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.material_name} audit - {'PASSED' if self.audit_passed else 'FAILED'}"

class WeatherEvent(TimeStampedModel):
    VERDICT_CHOICES = [
        ('approved', 'Delay Approved'),
        ('rejected', 'Delay Rejected'),
        ('pending', 'Pending Review'),
    ]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='weather_events')
    contractor_claim = models.TextField(help_text="Contractor's delay claim description")
    claimed_delay_days = models.PositiveIntegerField()
    actual_rainfall_mm = models.DecimalField(max_digits=8, decimal_places=2)
    verdict = models.CharField(max_length=20, choices=VERDICT_CHOICES, default='pending')
    date = models.DateField()

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"Weather event {self.date} - {self.verdict}"

class ESignatureRequest(TimeStampedModel):
    DOCUMENT_TYPE_CHOICES = [
        ('payment_release', 'Payment Release'),
        ('variation_order', 'Variation Order'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('signed', 'Signed'),
        ('rejected', 'Rejected'),
    ]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='esignature_requests')
    document_type = models.CharField(max_length=30, choices=DOCUMENT_TYPE_CHOICES)
    party_name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    due_date = models.DateField()

    class Meta:
        ordering = ['-due_date']

    def __str__(self):
        return f"{self.get_document_type_display()} - {self.party_name} (${self.amount})"

class SiteCamera(TimeStampedModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='site_cameras')
    name = models.CharField(max_length=255)
    active = models.BooleanField(default=True)
    recording = models.BooleanField(default=False)
    stream_url = models.URLField(blank=True, null=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({'Active' if self.active else 'Offline'})"


from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class ProjectBudgetVersion(TimeStampedModel):
    """One preliminary (working) and one final (signed) budget per project."""

    class Kind(models.TextChoices):
        PRELIMINARY = "PRELIMINARY", "Preliminary"
        FINAL = "FINAL", "Final"

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="budget_versions"
    )
    kind = models.CharField(max_length=20, choices=Kind.choices)
    signed_at = models.DateTimeField(null=True, blank=True)
    signed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="signed_budget_versions",
    )
    author_signature = models.CharField(
        max_length=255,
        blank=True,
        help_text="Signer display name at time of signing",
    )
    signature_image = models.TextField(
        blank=True,
        null=True,
        help_text="Snapshot of profile digital signature (data URL) at sign time",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["project", "kind"],
                name="uniq_builder_project_budgetversion_kind",
            )
        ]
        ordering = ["project_id", "kind"]

    def __str__(self):
        return f"{self.project_id} {self.kind}"


class BOQBuildingItem(TimeStampedModel):
    budget_version = models.ForeignKey(
        ProjectBudgetVersion,
        on_delete=models.CASCADE,
        related_name="building_items",
    )
    bill_no = models.CharField(max_length=50, blank=True, null=True)
    description = models.TextField(blank=True, default='')
    specification = models.TextField(blank=True, null=True, help_text="Material specification details")
    unit = models.CharField(max_length=30, blank=True, null=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=14, decimal_places=2, editable=False, default=0)
    is_ai_generated = models.BooleanField(default=False, help_text="True if generated by AI")

    class Meta:
        ordering = ['created_at']

    def save(self, *args, **kwargs):
        self.amount = self.quantity * self.rate
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.bill_no} - {self.amount}"

class BOQProfessionalFee(TimeStampedModel):
    budget_version = models.ForeignKey(
        ProjectBudgetVersion,
        on_delete=models.CASCADE,
        related_name="professional_fees",
    )
    discipline = models.CharField(max_length=255, blank=True, null=True)
    role_scope = models.TextField(blank=True, null=True)
    basis = models.CharField(max_length=255, blank=True, null=True)
    rate = models.CharField(max_length=255, blank=True, null=True)
    estimated_fee = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    is_ai_generated = models.BooleanField(default=False)

class BOQAdminExpense(TimeStampedModel):
    budget_version = models.ForeignKey(
        ProjectBudgetVersion,
        on_delete=models.CASCADE,
        related_name="admin_expenses",
    )
    item_role = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    trips_per_week = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_trips = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    distance = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    is_ai_generated = models.BooleanField(default=False)

class BOQLabourCost(TimeStampedModel):
    budget_version = models.ForeignKey(
        ProjectBudgetVersion,
        on_delete=models.CASCADE,
        related_name="labour_costs",
    )
    phase = models.CharField(max_length=255, blank=True, null=True)
    trade_role = models.CharField(max_length=255, blank=True, null=True)
    skill_level = models.CharField(max_length=100, blank=True, null=True)
    gang_size = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    duration_weeks = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_man_days = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    daily_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    weekly_wage_bill = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    is_ai_generated = models.BooleanField(default=False)

class BOQMachinePlant(TimeStampedModel):
    budget_version = models.ForeignKey(
        ProjectBudgetVersion,
        on_delete=models.CASCADE,
        related_name="machine_plants",
    )
    category = models.CharField(max_length=255, blank=True, null=True)
    machine_item = models.CharField(max_length=255, blank=True, null=True)
    qty = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    dry_hire_rate = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    fuel_l_hr = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    hrs_day = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fuel_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    operator_rate = models.CharField(max_length=100, null=True, blank=True)
    daily_wet_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    days_rqd = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    is_ai_generated = models.BooleanField(default=False)

class BOQLabourBreakdown(TimeStampedModel):
    budget_version = models.ForeignKey(
        ProjectBudgetVersion,
        on_delete=models.CASCADE,
        related_name="labour_breakdowns",
    )
    phase = models.CharField(max_length=255, blank=True, null=True)
    trade_role = models.CharField(max_length=255, blank=True, null=True)
    skill_level = models.CharField(max_length=100, blank=True, null=True)
    gang_size = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    duration_weeks = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_man_days = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    daily_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    is_ai_generated = models.BooleanField(default=False)

class BOQScheduleTask(TimeStampedModel):
    budget_version = models.ForeignKey(
        ProjectBudgetVersion,
        on_delete=models.CASCADE,
        related_name="schedule_tasks",
    )
    wbs = models.CharField(max_length=50, blank=True, null=True)
    task_description = models.CharField(max_length=255, blank=True, null=True)
    start_date = models.CharField(max_length=50, blank=True, null=True)
    end_date = models.CharField(max_length=50, blank=True, null=True)
    days = models.CharField(max_length=50, blank=True, null=True)
    predecessor = models.CharField(max_length=100, null=True, blank=True)
    est_cost = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    is_ai_generated = models.BooleanField(default=False)

class ScheduleOfMaterial(TimeStampedModel):
    SECTION_CHOICES = [
        ('SUBSTRUCTURE', 'Substructure'),
        ('SUPERSTRUCTURE', 'Superstructure'),
        ('ROOFING_CEILINGS', 'Roofing & Ceilings'),
        ('FINISHES', 'Finishes'),
        ('DOORS_WINDOWS', 'Doors & Windows'),
        ('PLUMBING', 'Plumbing & Drainage'),
        ('ELECTRICAL_SOLAR', 'Electrical & Solar Off-Grid'),
    ]
    budget_version = models.ForeignKey(
        ProjectBudgetVersion,
        on_delete=models.CASCADE,
        related_name="schedule_materials",
    )
    section = models.CharField(max_length=50, choices=SECTION_CHOICES)
    material_description = models.CharField(max_length=255)
    specification = models.TextField(blank=True, null=True, help_text="Detailed material specification")
    estimated_qty = models.CharField(max_length=100, blank=True, null=True, help_text="Estimated quantity with units, e.g. '50,000 units'")
    is_ai_generated = models.BooleanField(default=False)

    class Meta:
        ordering = ['section', 'created_at']

    def __str__(self):
        return f"{self.material_description} ({self.section})"

class BOQCorrection(TimeStampedModel):
    ACTION_CHOICES = [
        ('CREATE', 'Created Manually'),
        ('UPDATE', 'Modified AI Item'),
        ('DELETE', 'Deleted AI Item'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='boq_corrections')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Generic relation to link to ANY of the 7 tables
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    boq_record = GenericForeignKey('content_type', 'object_id')
    
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    was_ai_generated = models.BooleanField(default=False)
    previous_data = models.JSONField(null=True, blank=True)
    new_data = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_action_display()} on {self.project.title}"


class MaterialRequest(TimeStampedModel):
    METHOD_CHOICES = [
        ('SELF', 'Procure by Yourself'),
        ('GROUP_BUY', 'Group Buy Aggregator'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('ORDERED', 'Ordered'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
    ]
    CATEGORY_CHOICES = [
        ('MATERIAL', 'Building Material'),
        ('LABOUR', 'Labour'),
        ('PLANT', 'Plant & Equipment'),
        ('PROFESSIONAL', 'Professional Fee'),
        ('ADMIN', 'Admin & Expense'),
        ('OTHER', 'Other'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='material_requests')
    # Legacy FK — still used for BOQBuildingItem links
    boq_item = models.ForeignKey(BOQBuildingItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='requests')
    # Generic FK for linking to any of the 7 BOQ tables
    content_type = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    boq_source = GenericForeignKey('content_type', 'object_id')
    # Category tag for filtering
    procurement_category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='MATERIAL')

    material_name = models.CharField(max_length=255)
    quantity_requested = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=30, blank=True, default='')
    procurement_method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='SELF')
    price_at_request = models.DecimalField(max_digits=12, decimal_places=2)
    transport_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    group_buy_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_calculated_cost = models.DecimalField(max_digits=14, decimal_places=2, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        self.total_calculated_cost = (self.quantity_requested * self.price_at_request) + self.transport_cost - self.group_buy_deduction
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.material_name} [{self.procurement_category}] ({self.get_procurement_method_display()}) - {self.status}"


class DrawingRequest(TimeStampedModel):
    DRAWING_TYPE_CHOICES = [
        ('floor_plan', 'Floor Plan'),
        ('elevation', 'Elevation'),
        ('section', 'Section View'),
        ('3d_render', '3D Render'),
        ('blueprint', 'Technical Blueprint'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('REJECTED', 'Rejected'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='drawing_requests')
    drawing_type = models.CharField(max_length=20, choices=DRAWING_TYPE_CHOICES, default='floor_plan')
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.get_drawing_type_display()}) - {self.status}"


class DrawingFile(TimeStampedModel):
    request = models.ForeignKey(DrawingRequest, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to='drawing_files/')
    original_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50)
    file_size = models.CharField(max_length=50)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return self.original_name
class ProjectTeam(TimeStampedModel):
    ROLE_CHOICES = [
        ('architect', 'Architect'),
        ('structural_engineer', 'Structural Engineer'),
        ('contractor', 'General Contractor'),
        ('project_manager', 'Project Manager'),
        ('quantity_surveyor', 'Quantity Surveyor'),
        ('electrician', 'Electrician'),
        ('plumber', 'Plumber'),
        ('mason', 'Mason/Bricklayer'),
        ('carpenter', 'Carpenter'),
        ('painter', 'Painter'),
        ('roofer', 'Roofer'),
        ('tiler', 'Tiler'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('assigned', 'Assigned'),
        ('completed', 'Completed'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='team_members')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='team_assignments')
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['role', 'created_at']
        unique_together = ['project', 'user', 'role']

    def __str__(self):
        return f"{self.user.username} as {self.role} for {self.project.title}"


class ProjectMilestone(TimeStampedModel):
    """Project milestones for tracking progress"""
    CATEGORY_CHOICES = [
        ('design', 'Design'),
        ('budget', 'Budget'),
        ('procurement', 'Procurement'),
        ('construction', 'Construction'),
        ('other', 'Other'),
    ]
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='milestones')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    target_date = models.DateField()
    completed = models.BooleanField(default=False)
    completed_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['target_date', 'created_at']
    
    def __str__(self):
        return f"{self.project.title} - {self.name}"


class ProjectActivity(TimeStampedModel):
    """Activity log for project events"""
    TYPE_CHOICES = [
        ('team', 'Team'),
        ('budget', 'Budget'),
        ('procurement', 'Procurement'),
        ('design', 'Design'),
        ('status', 'Status'),
        ('document', 'Document'),
        ('general', 'General'),
    ]
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='activities')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='project_activities')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='general')
    action = models.CharField(max_length=255)
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Project activities'
    
    def __str__(self):
        return f"{self.project.title} - {self.action}"


class UserNotification(TimeStampedModel):
    """User notifications for project updates"""
    TYPE_CHOICES = [
        ('team', 'Team'),
        ('budget', 'Budget'),
        ('procurement', 'Procurement'),
        ('design', 'Design'),
        ('status', 'Status'),
        ('general', 'General'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='general')
    title = models.CharField(max_length=255)
    message = models.TextField()
    read = models.BooleanField(default=False)
    action_url = models.CharField(max_length=500, blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.title}"


class ArchitecturalDrawing(TimeStampedModel):
    """Stores the full architectural studio state (pages, layers, etc.) per project as JSON."""
    project = models.OneToOneField(
        Project,
        on_delete=models.CASCADE,
        related_name='architectural_drawing',
    )
    data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Full studio state: pages, activePageId, layers, activeLayer",
    )

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Drawing for {self.project.title}"


class ProjectDocument(TimeStampedModel):
    """Project documents storage"""
    TYPE_CHOICES = [
        ('contract', 'Contract'),
        ('permit', 'Permit'),
        ('invoice', 'Invoice'),
        ('insurance', 'Insurance'),
        ('warranty', 'Warranty'),
        ('other', 'Other'),
    ]
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='documents')
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='other')
    file = models.FileField(upload_to='project_documents/%Y/%m/')
    file_size = models.BigIntegerField(help_text="File size in bytes")
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='uploaded_documents')
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.project.title} - {self.name}"


class BudgetAnalysisHistory(TimeStampedModel):
    """Stores each Budget Engineer AI analysis run for a project."""
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name='analysis_history'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='budget_analyses',
    )
    file_name = models.CharField(
        max_length=255, blank=True, default='',
        help_text="Name of the drawing file that was analysed",
    )
    summary = models.TextField(blank=True, default='', help_text="AI summary text")
    data = models.JSONField(
        default=dict, blank=True,
        help_text="Full 8-sheet AnalyseResult JSON",
    )
    total_items = models.PositiveIntegerField(default=0)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Budget Analysis History'
        verbose_name_plural = 'Budget Analysis Histories'

    def __str__(self):
        return f"Analysis for {self.project.title} — {self.file_name or 'unknown'} ({self.created_at})"


class MaterialPool(TimeStampedModel):
    """Represents a wholesale aggregated material pool open for builder purchasing."""
    STATUS_CHOICES = [
        ('OPEN', 'Open for Joining'),
        ('LOCKED', 'Threshold Met & Locked'),
        ('DISPATCHED', 'In Transit'),
        ('CLEARED', 'Reconciled & Closed'),
    ]

    name = models.CharField(max_length=255, help_text="e.g. Cement (PPC)")
    supplier = models.CharField(max_length=255, help_text="e.g. Sino-Zim")
    source_location = models.CharField(max_length=255, help_text="e.g. Harare")
    moq = models.PositiveIntegerField(help_text="Minimum Aggregate Qty for Tier 2 pricing (e.g. 600)")
    current_volume = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    base_price = models.DecimalField(max_digits=12, decimal_places=2, help_text="Current retail base price")
    tier_2_discount = models.DecimalField(max_digits=12, decimal_places=2, help_text="Discount applied when MOQ is reached")
    dispatch_date = models.DateField(help_text="Expected logistics send date")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')

    class Meta:
        ordering = ['dispatch_date', 'name']

    def __str__(self):
        return f"{self.name} - {self.supplier} ({self.status})"

class MaterialPoolCommitment(TimeStampedModel):
    """Tracks a user/project commitment joining a MaterialPool."""
    STATUS_CHOICES = [
        ('LOCKED', 'Locked & Deposit Held'),
        ('CANCELLED', 'Cancelled'),
        ('CLEARED', 'Fulfilled'),
    ]

    pool = models.ForeignKey(MaterialPool, on_delete=models.CASCADE, related_name='commitments')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='pool_commitments')
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    deposit_paid = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='LOCKED')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Commitment {self.quantity} of {self.pool.name} by {self.project.title}"

