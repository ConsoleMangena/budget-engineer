from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.authentication.models import Profile
from apps.contractor_dashboard.models import ProfessionalProfile
import random

class Command(BaseCommand):
    help = 'Seeds the database with professional profiles'

    def handle(self, *args, **options):
        roles = [
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

        locations = ['Harare, Zimbabwe', 'Bulawayo, Zimbabwe', 'Mutare, Zimbabwe', 'Gweru, Zimbabwe']
        companies = ['BuildCo Ltd', 'Design Systems', 'Harare Structures', 'Elite Construction', 'Global Architects']
        specialties_list = [
            ['Residential Design', 'Sustainable Building', '3D Modeling'],
            ['Reinforced Concrete', 'Steel Structures', 'Foundation Engineering'],
            ['Project Planning', 'Site Management', 'Safety Oversight'],
            ['Interior Design', 'Landscape Architecture', 'Urban Planning'],
            ['Commercial Wiring', 'Solar Installation', 'Fault Finding'],
            ['Piping Systems', 'Industrial Plumbing', 'Water Treatment']
        ]

        self.stdout.write("Seeding professional profiles...")

        for i in range(15):
            username = f"pro_user_{i+100}" # Start from 100 to avoid conflicts with previous seed
            if not User.objects.filter(username=username).exists():
                first_name = random.choice(['John', 'Jane', 'Blessing', 'Farai', 'Tendai', 'Grace', 'Robert', 'Sarah'])
                last_name = random.choice(['Moyo', 'Sibanda', 'Chuma', 'Dube', 'Ncube', 'Phiri', 'Gumbo', 'Mutasa'])
                user = User.objects.create_user(
                    username=username,
                    email=f"{username}@example.com",
                    password="password123",
                    first_name=first_name,
                    last_name=last_name
                )
                
                profile, created = Profile.objects.get_or_create(user=user)
                profile.phone_number = f"+263 7{random.randint(11, 99)} {random.randint(100, 999)} {random.randint(100, 999)}"
                profile.save()

                role_code, role_label = random.choice(roles)
                
                ProfessionalProfile.objects.create(
                    user=user,
                    role=role_code,
                    company_name=random.choice(companies),
                    location=random.choice(locations),
                    experience_years=random.randint(2, 25),
                    bio=f"Experienced {role_label} with a track record of delivering high-quality construction projects across Zimbabwe.",
                    hourly_rate=f"${random.randint(30, 150)}/hour",
                    availability=random.choice(['available', 'available', 'busy']),
                    is_verified=random.choice([True, True, False]),
                    specialties=random.choice(specialties_list),
                    certifications=['ZAC Registered', 'EMA Certified', 'Standardization Certificate'],
                    average_rating=round(random.uniform(3.5, 5.0), 1),
                    completed_projects_count=random.randint(5, 50)
                )
                self.stdout.write(self.style.SUCCESS(f"Created profile for {user.get_full_name()} as {role_label}"))

        self.stdout.write(self.style.SUCCESS("Seeding complete!"))
