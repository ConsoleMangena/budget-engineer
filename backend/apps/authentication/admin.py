from django.contrib import admin
from django.utils import timezone
from .models import Profile, AccountRequest


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'is_approved', 'phone_number']
    list_filter = ['role', 'is_approved']
    search_fields = ['user__email', 'user__username', 'first_name', 'last_name']
    list_editable = ['is_approved']


def approve_requests(modeladmin, request, queryset):
    """Bulk approve selected account requests and grant platform access."""
    from django.contrib.auth.models import User
    for account_request in queryset.filter(status='PENDING'):
        account_request.status = 'APPROVED'
        account_request.reviewed_at = timezone.now()
        account_request.reviewed_by = request.user
        account_request.save()
        # Grant access on the profile
        profile, _ = Profile.objects.get_or_create(user=account_request.user)
        profile.is_approved = True
        profile.role = account_request.requested_role
        profile.save()

approve_requests.short_description = "✅ Approve selected requests"


def reject_requests(modeladmin, request, queryset):
    """Bulk reject selected account requests."""
    queryset.filter(status='PENDING').update(
        status='REJECTED',
        reviewed_at=timezone.now(),
        reviewed_by=request.user
    )

reject_requests.short_description = "❌ Reject selected requests"


@admin.register(AccountRequest)
class AccountRequestAdmin(admin.ModelAdmin):
    list_display = ['user_email', 'requested_role', 'status', 'created_at', 'reviewed_by', 'reviewed_at']
    list_filter = ['status', 'requested_role']
    search_fields = ['user__email', 'user__username']
    readonly_fields = ['created_at', 'reviewed_at']
    actions = [approve_requests, reject_requests]

    class Media:
        js = ('admin/js/autorefresh.js',)

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Applicant Email'
    user_email.admin_order_field = 'user__email'
