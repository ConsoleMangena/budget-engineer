from django.core.management.base import BaseCommand
from apps.builder_dashboard.models import Project, ScheduleOfMaterial, BOQBuildingItem
from apps.builder_dashboard.budget_utils import get_or_create_preliminary_version

class Command(BaseCommand):
    help = 'Seeds schedule of materials for testing'

    def handle(self, *args, **options):
        project = Project.objects.first()
        if not project:
            self.stdout.write("No projects found")
            return

        bv = get_or_create_preliminary_version(project)

        # Add 1 building item
        BOQBuildingItem.objects.create(
            budget_version=bv,
            bill_no='1/1',
            description='Excavation for foundation',
            specification='Excavate trenches not exceeding 1.5m deep',
            unit='m3',
            quantity=55.5,
            rate=120.0,
            is_ai_generated=False
        )

        # Add some schedule materials
        ScheduleOfMaterial.objects.create(
            budget_version=bv,
            section='SUBSTRUCTURE',
            material_description='Cement (32.5N)',
            specification='PPC Cement for concrete blinding and brickwork',
            estimated_qty='50 bags'
        )
        ScheduleOfMaterial.objects.create(
            budget_version=bv,
            section='SUBSTRUCTURE',
            material_description='River Sand',
            specification='Clean river sand for mortar',
            estimated_qty='10 cubic meters'
        )
        ScheduleOfMaterial.objects.create(
            budget_version=bv,
            section='SUPERSTRUCTURE',
            material_description='Load-bearing Bricks',
            specification='Standard solid clay bricks (230x110x75mm), min compressive strength 14MPa',
            estimated_qty='50,000 units'
        )
        ScheduleOfMaterial.objects.create(
            budget_version=bv,
            section='ROOFING_CEILINGS',
            material_description='Corrugated Iron Sheets',
            specification='0.5mm thickness, galvanized, Z275 coating',
            estimated_qty='150 sheets'
        )

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded materials for project {project.title}'))
