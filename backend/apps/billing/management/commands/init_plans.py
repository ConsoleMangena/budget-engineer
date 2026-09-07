from django.core.management.base import BaseCommand
from apps.billing.models import SubscriptionPlan


class Command(BaseCommand):
    help = 'Creates initial subscription plans'

    def handle(self, *args, **kwargs):
        plans = [
            {
                'name': 'FREE',
                'display_name': 'Free',
                'description': 'Perfect for getting started',
                'price': 0.00,
                'max_projects': 1,
                'storage_gb': 5,
                'support_level': 'Basic',
                'has_analytics': False,
                'has_custom_branding': False,
                'has_custom_integration': False,
                'has_dedicated_manager': False,
            },
            {
                'name': 'PROFESSIONAL',
                'display_name': 'Professional',
                'description': 'For growing teams',
                'price': 29.00,
                'max_projects': 10,
                'storage_gb': 50,
                'support_level': 'Priority',
                'has_analytics': True,
                'has_custom_branding': True,
                'has_custom_integration': False,
                'has_dedicated_manager': False,
            },
            {
                'name': 'ENTERPRISE',
                'display_name': 'Enterprise',
                'description': 'For large organizations',
                'price': 99.00,
                'max_projects': -1,  # Unlimited
                'storage_gb': 500,
                'support_level': '24/7',
                'has_analytics': True,
                'has_custom_branding': True,
                'has_custom_integration': True,
                'has_dedicated_manager': True,
            },
        ]

        for plan_data in plans:
            plan, created = SubscriptionPlan.objects.get_or_create(
                name=plan_data['name'],
                defaults=plan_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created plan: {plan.display_name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Plan already exists: {plan.display_name}'))

        self.stdout.write(self.style.SUCCESS('Successfully initialized subscription plans'))
