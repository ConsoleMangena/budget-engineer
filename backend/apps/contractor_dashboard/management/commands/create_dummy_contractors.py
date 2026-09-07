from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.contractor_dashboard.models import ContractorProfile
from apps.authentication.models import Profile

class Command(BaseCommand):
    help = 'Creates dummy contractor data for testing'

    def handle(self, *args, **kwargs):
        contractors_data = [
            {
                'username': 'contractor1',
                'email': 'john.mutasa@construction.co.zw',
                'first_name': 'John',
                'last_name': 'Mutasa',
                'phone_number': '+263 77 123 4567',
                'company_name': 'Mutasa Construction Ltd',
                'license_number': 'LIC-2024-001',
            },
            {
                'username': 'contractor2',
                'email': 'sarah.chikwava@buildpro.zw',
                'first_name': 'Sarah',
                'last_name': 'Chikwava',
                'phone_number': '+263 77 234 5678',
                'company_name': 'BuildPro Zimbabwe',
                'license_number': 'LIC-2024-002',
            },
            {
                'username': 'contractor3',
                'email': 'tendai.makoni@zimbuild.co.zw',
                'first_name': 'Tendai',
                'last_name': 'Makoni',
                'phone_number': '+263 77 345 6789',
                'company_name': 'ZimBuild Contractors',
                'license_number': 'LIC-2024-003',
            },
            {
                'username': 'contractor4',
                'email': 'david.moyo@premierbuild.zw',
                'first_name': 'David',
                'last_name': 'Moyo',
                'phone_number': '+263 77 456 7890',
                'company_name': 'Premier Builders',
                'license_number': 'LIC-2024-004',
            },
            {
                'username': 'contractor5',
                'email': 'grace.ndlovu@excelconstruction.zw',
                'first_name': 'Grace',
                'last_name': 'Ndlovu',
                'phone_number': '+263 77 567 8901',
                'company_name': 'Excel Construction Services',
                'license_number': 'LIC-2024-005',
            },
        ]

        created_count = 0
        for contractor_data in contractors_data:
            # Check if user already exists
            user, user_created = User.objects.get_or_create(
                username=contractor_data['username'],
                defaults={
                    'email': contractor_data['email'],
                    'first_name': contractor_data['first_name'],
                    'last_name': contractor_data['last_name'],
                }
            )

            if user_created:
                user.set_password('contractor123')  # Default password
                user.save()

            # Create or update profile
            profile, profile_created = Profile.objects.get_or_create(
                user=user,
                defaults={'role': 'CONTRACTOR', 'phone_number': contractor_data['phone_number']}
            )
            if not profile_created:
                profile.role = 'CONTRACTOR'
                profile.phone_number = contractor_data['phone_number']
                profile.save()

            # Create or update contractor profile
            contractor_profile, contractor_created = ContractorProfile.objects.get_or_create(
                user=user,
                defaults={
                    'company_name': contractor_data['company_name'],
                    'license_number': contractor_data['license_number'],
                }
            )

            if contractor_created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Created contractor: {contractor_data["company_name"]}'))
            else:
                self.stdout.write(self.style.WARNING(f'Contractor already exists: {contractor_data["company_name"]}'))

        self.stdout.write(self.style.SUCCESS(f'Successfully created {created_count} new contractors'))
        self.stdout.write(self.style.SUCCESS(f'Total contractors in system: {ContractorProfile.objects.count()}'))

