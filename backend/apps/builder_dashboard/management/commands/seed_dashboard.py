from django.core.management.base import BaseCommand
from datetime import date, timedelta
from apps.builder_dashboard.models import (
    Project, EscrowMilestone, CapitalSchedule, MaterialAudit,
    WeatherEvent, ESignatureRequest, SiteCamera
)

class Command(BaseCommand):
    help = 'Seed dashboard widget test data for all projects'

    def handle(self, *args, **options):
        projects = Project.objects.all()
        if not projects.exists():
            self.stdout.write(self.style.WARNING('No projects found. Create a project first.'))
            return

        for project in projects:
            # Escrow Milestones
            if not project.escrow_milestones.exists():
                EscrowMilestone.objects.bulk_create([
                    EscrowMilestone(project=project, name='Foundation Complete', amount=15000, status='completed', released=True),
                    EscrowMilestone(project=project, name='Superstructure 50%', amount=20000, status='pending', released=False),
                    EscrowMilestone(project=project, name='Roofing Complete', amount=18000, status='locked', released=False),
                    EscrowMilestone(project=project, name='Finishes', amount=12000, status='locked', released=False),
                ])
                self.stdout.write(f'  ✓ Escrow milestones for "{project.title}"')

            # Capital Schedule
            if not project.capital_schedules.exists():
                today = date.today()
                CapitalSchedule.objects.bulk_create([
                    CapitalSchedule(project=project, description='Foundation Materials', amount=3000, due_date=today - timedelta(days=30), status='paid'),
                    CapitalSchedule(project=project, description='Labor Payment', amount=1000, due_date=today + timedelta(days=15), status='upcoming'),
                    CapitalSchedule(project=project, description='Roofing Materials', amount=5000, due_date=today + timedelta(days=45), status='upcoming'),
                ])
                self.stdout.write(f'  ✓ Capital schedule for "{project.title}"')

            # Material Audits
            if not project.material_audits.exists():
                MaterialAudit.objects.bulk_create([
                    MaterialAudit(
                        project=project, material_name='Bricks',
                        delivered_qty=10000, installed_qty=9850,
                        theoretical_usage=85, actual_usage=85,
                        unit='bags (cement)', audit_passed=True
                    ),
                    MaterialAudit(
                        project=project, material_name='Reinforcing Steel',
                        delivered_qty=500, installed_qty=480,
                        theoretical_usage=480, actual_usage=495,
                        unit='kg', audit_passed=False
                    ),
                ])
                self.stdout.write(f'  ✓ Material audits for "{project.title}"')

            # Weather Events
            if not project.weather_events.exists():
                WeatherEvent.objects.create(
                    project=project,
                    contractor_claim='Heavy rains flooded trenches.',
                    claimed_delay_days=2,
                    actual_rainfall_mm=0.0,
                    verdict='rejected',
                    date=date.today() - timedelta(days=3)
                )
                self.stdout.write(f'  ✓ Weather events for "{project.title}"')

            # E-Signature Requests
            if not project.esignature_requests.exists():
                ESignatureRequest.objects.bulk_create([
                    ESignatureRequest(
                        project=project, document_type='payment_release',
                        party_name='BuildRight Ltd', amount=20000,
                        status='pending', due_date=date.today() - timedelta(days=5)
                    ),
                    ESignatureRequest(
                        project=project, document_type='variation_order',
                        party_name='BuildRight Ltd', amount=500,
                        status='pending', due_date=date.today() - timedelta(days=6)
                    ),
                ])
                self.stdout.write(f'  ✓ E-signature requests for "{project.title}"')

            # Site Cameras
            if not project.site_cameras.exists():
                SiteCamera.objects.bulk_create([
                    SiteCamera(project=project, name='Main Entrance', active=True, recording=True),
                    SiteCamera(project=project, name='Foundation Area', active=True, recording=True),
                    SiteCamera(project=project, name='Material Storage', active=False, recording=False),
                    SiteCamera(project=project, name='Worker Zone', active=True, recording=True),
                ])
                self.stdout.write(f'  ✓ Site cameras for "{project.title}"')

        self.stdout.write(self.style.SUCCESS(f'\nSeeded dashboard data for {projects.count()} project(s).'))
