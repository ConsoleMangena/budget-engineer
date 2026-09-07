from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel


# ── Floor Plan models (restored — were deleted in builder_dashboard migration 0004) ──

class FloorPlanCategory(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True, help_text="Category name, e.g., 'Residential', 'Commercial'")
    description = models.TextField(blank=True, null=True, help_text="Optional description for this category")

    class Meta:
        verbose_name_plural = "Floor Plan Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class FloorPlanDataset(TimeStampedModel):
    title = models.CharField(max_length=255, help_text="Title of the floor plan dataset")
    description = models.TextField(blank=True, null=True, help_text="Detailed description of the floor plan")
    image = models.ImageField(upload_to='floor_plans/', help_text="2D Floor plan image file")
    category = models.ForeignKey(FloorPlanCategory, on_delete=models.CASCADE, related_name='datasets')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='uploaded_floor_plans'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


# ── Platform Settings (singleton) ──

class PlatformSettings(TimeStampedModel):
    site_name = models.CharField(max_length=255, default='AfriConTech Hub')
    tagline = models.CharField(max_length=500, blank=True, default='Building Africa\'s Future')
    support_email = models.EmailField(blank=True, default='support@africacontechhub.com')
    registration_open = models.BooleanField(default=True, help_text='Allow new user registrations')
    require_approval = models.BooleanField(default=True, help_text='Require admin approval for new accounts')
    maintenance_mode = models.BooleanField(default=False, help_text='Put platform in maintenance mode')
    maintenance_message = models.TextField(blank=True, default='We are currently performing maintenance. Please check back soon.')
    default_role = models.CharField(max_length=20, default='BUILDER', choices=[
        ('BUILDER', 'Builder'),
        ('CONTRACTOR', 'Contractor'),
        ('SUPPLIER', 'Supplier'),
    ])
    max_projects_per_user = models.PositiveIntegerField(default=10)
    max_file_upload_mb = models.PositiveIntegerField(default=10)

    class Meta:
        verbose_name = "Platform Settings"
        verbose_name_plural = "Platform Settings"

    def __str__(self):
        return self.site_name

    def save(self, *args, **kwargs):
        # Enforce singleton
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


# ── Admin Activity Log ──

class AdminActivityLog(TimeStampedModel):
    ACTION_CHOICES = [
        ('USER_CREATED', 'User Created'),
        ('USER_DELETED', 'User Deleted'),
        ('USER_ROLE_CHANGED', 'User Role Changed'),
        ('USER_TOGGLED', 'User Activated/Deactivated'),
        ('REQUEST_APPROVED', 'Request Approved'),
        ('REQUEST_REJECTED', 'Request Rejected'),
        ('SETTINGS_CHANGED', 'Settings Changed'),
        ('DOCUMENT_UPLOADED', 'Document Uploaded'),
        ('DOCUMENT_DELETED', 'Document Deleted'),
        ('OTHER', 'Other'),
    ]

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='admin_actions'
    )
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    target_type = models.CharField(max_length=50, blank=True, help_text='e.g. User, AccountRequest, Document')
    target_id = models.PositiveIntegerField(null=True, blank=True)
    target_label = models.CharField(max_length=255, blank=True, help_text='Human-readable target description')
    detail = models.TextField(blank=True, help_text='Extra context about the action')
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Admin Activity Log"
        verbose_name_plural = "Admin Activity Logs"

    def __str__(self):
        return f"{self.actor} — {self.get_action_display()} — {self.target_label}"


def log_admin_action(request, action, target_type='', target_id=None, target_label='', detail=''):
    """Helper to create an activity log entry."""
    ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
    if ',' in ip:
        ip = ip.split(',')[0].strip()
    AdminActivityLog.objects.create(
        actor=request.user,
        action=action,
        target_type=target_type,
        target_id=target_id,
        target_label=target_label,
        detail=detail,
        ip_address=ip or None,
    )


# ── User Activity Tracking ──

class UserActivityEvent(TimeStampedModel):
    """
    Lightweight audit trail for what a user is doing/looking at in the system.
    Logged by the frontend on route changes (and optionally other events).
    """
    EVENT_CHOICES = [
        ('PAGE_VIEW', 'Page View'),
        ('CLICK', 'Click'),
        ('ACTION', 'Action'),
        ('OTHER', 'Other'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='activity_events'
    )
    event_type = models.CharField(max_length=20, choices=EVENT_CHOICES, default='PAGE_VIEW')
    path = models.CharField(max_length=512, blank=True, default='')
    title = models.CharField(max_length=255, blank=True, default='')
    referrer = models.CharField(max_length=512, blank=True, default='')
    metadata = models.JSONField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "User Activity Event"
        verbose_name_plural = "User Activity Events"

    def __str__(self):
        return f"{self.user} — {self.event_type} — {self.path or self.title or '—'}"


def log_user_activity(request, user, event_type='PAGE_VIEW', path='', title='', referrer='', metadata=None):
    ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
    if ',' in ip:
        ip = ip.split(',')[0].strip()
    UserActivityEvent.objects.create(
        user=user,
        event_type=event_type or 'PAGE_VIEW',
        path=path or '',
        title=title or '',
        referrer=referrer or '',
        metadata=metadata or None,
        ip_address=ip or None,
    )
