from django.db import models
from django.contrib.auth.models import User


class Profile(models.Model):
    ROLE_CHOICES = [
        ('BUILDER', 'Aspirational Builder'),
        ('CONTRACTOR', 'Professional Contractor'),
        ('SUPPLIER', 'Material Supplier'),
        ('ADMIN', 'Administrator'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='BUILDER')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)

    # Supabase UUID (if needed for direct mapping, though User.username usually holds the ID)
    supabase_id = models.CharField(max_length=100, blank=True, null=True)
    signature = models.TextField(blank=True, null=True, help_text="Base64 encoded signature image")

    # Account approval gate
    is_approved = models.BooleanField(
        default=False,
        help_text="Admin must approve this account before the user can access the platform."
    )

    def __str__(self):
        return f"{self.user.username} - {self.role}"


class AccountRequest(models.Model):
    """
    Tracks account creation requests that must be approved by an Administrator
    before the user gains access to the platform.
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='account_request'
    )
    requested_role = models.CharField(max_length=20, default='BUILDER')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_requests'
    )
    notes = models.TextField(blank=True, null=True, help_text="Optional rejection reason or notes.")

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Account Request'
        verbose_name_plural = 'Account Requests'

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Auto-sync profile approval when status changes
        if self.status == 'APPROVED':
            profile, _ = Profile.objects.get_or_create(user=self.user)
            profile.is_approved = True
            profile.role = self.requested_role
            profile.save()
        elif self.status == 'REJECTED':
            profile, _ = Profile.objects.get_or_create(user=self.user)
            profile.is_approved = False
            profile.save()

    def __str__(self):
        return f"{self.user.email} — {self.status}"
