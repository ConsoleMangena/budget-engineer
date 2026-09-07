from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Profile, AccountRequest


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Auto-create a Profile when a new User is created.
    Uses get_or_create so it won't clash if RegisterRequestView
    or SupabaseAuthentication already made one.
    """
    if created:
        Profile.objects.get_or_create(
            user=instance,
            defaults={
                'role': 'BUILDER',
                'is_approved': False,
            }
        )


@receiver(post_save, sender=Profile)
def create_account_request_for_profile(sender, instance, created, **kwargs):
    """
    Whenever a NEW Profile is created with is_approved=False,
    auto-create a PENDING AccountRequest so it shows in Django admin.
    """
    if created and not instance.is_approved:
        AccountRequest.objects.get_or_create(
            user=instance.user,
            defaults={
                'requested_role': instance.role,
                'status': 'PENDING',
            }
        )
