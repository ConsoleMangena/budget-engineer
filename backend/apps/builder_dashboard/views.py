from rest_framework import viewsets, permissions, views, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Q, Avg
from django.db import models
from django.utils import timezone
from django.shortcuts import get_object_or_404
import uuid
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import (
    Project, SiteUpdate, EscrowMilestone, CapitalSchedule,
    MaterialAudit, WeatherEvent, ESignatureRequest, SiteCamera,
    BOQBuildingItem, BOQProfessionalFee, BOQAdminExpense,
    BOQLabourCost, BOQMachinePlant, BOQLabourBreakdown, BOQScheduleTask,
    MaterialRequest, DrawingRequest, DrawingFile, ProjectTeam,
    BOQCorrection, ScheduleOfMaterial, ProjectBudgetVersion,
    ProjectMilestone, ProjectActivity, UserNotification, ProjectDocument,
    ArchitecturalDrawing, BudgetAnalysisHistory,
    MaterialPool, MaterialPoolCommitment,
)
from .budget_utils import (
    get_or_create_preliminary_version,
    promote_preliminary_to_final,
    final_version_is_locked,
    format_gross_total,
)
from .serializers import (
    ProjectSerializer, SiteUpdateSerializer, EscrowMilestoneSerializer,
    CapitalScheduleSerializer, MaterialAuditSerializer, WeatherEventSerializer,
    ESignatureRequestSerializer, SiteCameraSerializer, BOQBuildingItemSerializer,
    BOQProfessionalFeeSerializer, BOQAdminExpenseSerializer, BOQLabourCostSerializer,
    BOQMachinePlantSerializer, BOQLabourBreakdownSerializer, BOQScheduleTaskSerializer,
    MaterialRequestSerializer, DrawingRequestSerializer, DrawingFileSerializer,
    ProjectTeamSerializer, BOQCorrectionSerializer, ScheduleOfMaterialSerializer,
    ProjectMilestoneSerializer, ProjectActivitySerializer, UserNotificationSerializer,
    ProjectDocumentSerializer, ArchitecturalDrawingSerializer,
    BudgetAnalysisHistorySerializer,
    MaterialPoolSerializer, MaterialPoolCommitmentSerializer,
)
from apps.authentication.models import Profile
from apps.authentication.permissions import IsBuilder, IsAdmin
from apps.contractor_dashboard.models import Bid, ContractorProfile, ContractorRating
from apps.supplier_dashboard.models import MaterialOrder, SupplierProfile

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def get_queryset(self):
        return Project.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class SiteUpdateViewSet(viewsets.ModelViewSet):
    serializer_class = SiteUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def get_queryset(self):
        return SiteUpdate.objects.filter(project__owner=self.request.user)

class ProjectDashboardView(views.APIView):
    """
    Unified endpoint returning all widget data for a project detail view.
    GET /api/v1/projects/<pk>/dashboard/
    """
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def get(self, request, pk):
        try:
            project = Project.objects.get(id=pk, owner=request.user)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=404)

        return Response({
            'escrow_milestones': EscrowMilestoneSerializer(
                project.escrow_milestones.all(), many=True
            ).data,
            'capital_schedule': CapitalScheduleSerializer(
                project.capital_schedules.all(), many=True
            ).data,
            'material_audits': MaterialAuditSerializer(
                project.material_audits.all(), many=True
            ).data,
            'weather_events': WeatherEventSerializer(
                project.weather_events.all(), many=True
            ).data,
            'esignature_requests': ESignatureRequestSerializer(
                project.esignature_requests.filter(status='pending'), many=True
            ).data,
            'site_cameras': SiteCameraSerializer(
                project.site_cameras.all(), many=True
            ).data,
            'unverified_updates': SiteUpdateSerializer(
                project.site_updates.filter(verified=False), many=True
            ).data,
        })

class EscrowMilestoneViewSet(viewsets.ModelViewSet):
    serializer_class = EscrowMilestoneSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def get_queryset(self):
        return EscrowMilestone.objects.filter(project__owner=self.request.user)

    def perform_create(self, serializer):
        from django.shortcuts import get_object_or_404
        project = get_object_or_404(Project, id=self.request.data.get('project'), owner=self.request.user)
        serializer.save(project=project)

class CapitalScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = CapitalScheduleSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def get_queryset(self):
        return CapitalSchedule.objects.filter(project__owner=self.request.user)

    def perform_create(self, serializer):
        from django.shortcuts import get_object_or_404
        project = get_object_or_404(Project, id=self.request.data.get('project'), owner=self.request.user)
        serializer.save(project=project)

class MaterialAuditViewSet(viewsets.ModelViewSet):
    serializer_class = MaterialAuditSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def get_queryset(self):
        qs = MaterialAudit.objects.filter(project__owner=self.request.user)
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        from django.shortcuts import get_object_or_404
        project = get_object_or_404(Project, id=self.request.data.get('project'), owner=self.request.user)
        serializer.save(project=project)

class WeatherEventViewSet(viewsets.ModelViewSet):
    serializer_class = WeatherEventSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def get_queryset(self):
        return WeatherEvent.objects.filter(project__owner=self.request.user)

    def perform_create(self, serializer):
        from django.shortcuts import get_object_or_404
        project = get_object_or_404(Project, id=self.request.data.get('project'), owner=self.request.user)
        serializer.save(project=project)

class ESignatureRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ESignatureRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def get_queryset(self):
        qs = ESignatureRequest.objects.filter(project__owner=self.request.user)
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        from django.shortcuts import get_object_or_404
        project = get_object_or_404(Project, id=self.request.data.get('project'), owner=self.request.user)
        serializer.save(project=project)

class SiteCameraViewSet(viewsets.ModelViewSet):
    serializer_class = SiteCameraSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def get_queryset(self):
        return SiteCamera.objects.filter(project__owner=self.request.user)

    def perform_create(self, serializer):
        from django.shortcuts import get_object_or_404
        project = get_object_or_404(Project, id=self.request.data.get('project'), owner=self.request.user)
        serializer.save(project=project)

def _budget_kind_filter(queryset, request):
    bk = request.query_params.get('budget_kind', 'preliminary').lower()
    if bk == 'final':
        return queryset.filter(budget_version__kind=ProjectBudgetVersion.Kind.FINAL)
    return queryset.filter(budget_version__kind=ProjectBudgetVersion.Kind.PRELIMINARY)


class BOQCorrectionMixin:
    def perform_create(self, serializer):
        from django.shortcuts import get_object_or_404
        from django.contrib.contenttypes.models import ContentType
        project = get_object_or_404(Project, id=self.request.data.get('project'), owner=self.request.user)
        bv = get_or_create_preliminary_version(project)

        is_ai = str(self.request.data.get('is_ai_generated', False)).lower() == 'true'
        instance = serializer.save(budget_version=bv, is_ai_generated=is_ai)

        ct = ContentType.objects.get_for_model(instance)
        BOQCorrection.objects.create(
            project=project,
            user=self.request.user,
            content_type=ct,
            object_id=instance.id,
            action='CREATE',
            was_ai_generated=is_ai,
            previous_data=None,
            new_data=self.get_serializer(instance).data
        )

    def perform_update(self, serializer):
        from django.contrib.contenttypes.models import ContentType
        old_instance = self.get_object()
        if final_version_is_locked(old_instance.budget_version):
            raise PermissionDenied('The signed final budget cannot be edited.')
        old_data = self.get_serializer(old_instance).data
        was_ai = getattr(old_instance, 'is_ai_generated', False)

        instance = serializer.save()
        new_data = self.get_serializer(instance).data

        ct = ContentType.objects.get_for_model(instance)
        BOQCorrection.objects.create(
            project=instance.budget_version.project,
            user=self.request.user,
            content_type=ct,
            object_id=instance.id,
            action='UPDATE',
            was_ai_generated=was_ai,
            previous_data=old_data,
            new_data=new_data
        )

    def perform_destroy(self, instance):
        if final_version_is_locked(instance.budget_version):
            raise PermissionDenied('The signed final budget cannot be deleted.')
        old_data = self.get_serializer(instance).data
        project = instance.budget_version.project
        was_ai = getattr(instance, 'is_ai_generated', False)

        BOQCorrection.objects.create(
            project=project,
            user=self.request.user,
            content_type=None,
            object_id=None,
            action='DELETE',
            was_ai_generated=was_ai,
            previous_data=old_data,
            new_data=None
        )
        instance.delete()

class BOQBuildingItemViewSet(BOQCorrectionMixin, viewsets.ModelViewSet):
    serializer_class = BOQBuildingItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]
    def get_queryset(self):
        qs = BOQBuildingItem.objects.filter(budget_version__project__owner=self.request.user)
        if pid := self.request.query_params.get('project'):
            qs = qs.filter(budget_version__project_id=pid)
        return _budget_kind_filter(qs, self.request)

class BOQProfessionalFeeViewSet(BOQCorrectionMixin, viewsets.ModelViewSet):
    serializer_class = BOQProfessionalFeeSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]
    def get_queryset(self):
        qs = BOQProfessionalFee.objects.filter(budget_version__project__owner=self.request.user)
        if pid := self.request.query_params.get('project'):
            qs = qs.filter(budget_version__project_id=pid)
        return _budget_kind_filter(qs, self.request)

class BOQAdminExpenseViewSet(BOQCorrectionMixin, viewsets.ModelViewSet):
    serializer_class = BOQAdminExpenseSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]
    def get_queryset(self):
        qs = BOQAdminExpense.objects.filter(budget_version__project__owner=self.request.user)
        if pid := self.request.query_params.get('project'):
            qs = qs.filter(budget_version__project_id=pid)
        return _budget_kind_filter(qs, self.request)

class BOQLabourCostViewSet(BOQCorrectionMixin, viewsets.ModelViewSet):
    serializer_class = BOQLabourCostSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]
    def get_queryset(self):
        qs = BOQLabourCost.objects.filter(budget_version__project__owner=self.request.user)
        if pid := self.request.query_params.get('project'):
            qs = qs.filter(budget_version__project_id=pid)
        return _budget_kind_filter(qs, self.request)

class BOQMachinePlantViewSet(BOQCorrectionMixin, viewsets.ModelViewSet):
    serializer_class = BOQMachinePlantSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]
    def get_queryset(self):
        qs = BOQMachinePlant.objects.filter(budget_version__project__owner=self.request.user)
        if pid := self.request.query_params.get('project'):
            qs = qs.filter(budget_version__project_id=pid)
        return _budget_kind_filter(qs, self.request)

class BOQLabourBreakdownViewSet(BOQCorrectionMixin, viewsets.ModelViewSet):
    serializer_class = BOQLabourBreakdownSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]
    def get_queryset(self):
        qs = BOQLabourBreakdown.objects.filter(budget_version__project__owner=self.request.user)
        if pid := self.request.query_params.get('project'):
            qs = qs.filter(budget_version__project_id=pid)
        return _budget_kind_filter(qs, self.request)

class BOQScheduleTaskViewSet(BOQCorrectionMixin, viewsets.ModelViewSet):
    serializer_class = BOQScheduleTaskSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]
    def get_queryset(self):
        qs = BOQScheduleTask.objects.filter(budget_version__project__owner=self.request.user)
        if pid := self.request.query_params.get('project'):
            qs = qs.filter(budget_version__project_id=pid)
        return _budget_kind_filter(qs, self.request)

class ScheduleOfMaterialViewSet(BOQCorrectionMixin, viewsets.ModelViewSet):
    serializer_class = ScheduleOfMaterialSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]
    def get_queryset(self):
        qs = ScheduleOfMaterial.objects.filter(budget_version__project__owner=self.request.user)
        if pid := self.request.query_params.get('project'):
            qs = qs.filter(budget_version__project_id=pid)
        return _budget_kind_filter(qs, self.request)


def _budget_sheets_payload(project: Project, kind: str):
    """kind: 'preliminary' | 'final'"""
    vkind = (
        ProjectBudgetVersion.Kind.FINAL
        if kind == 'final'
        else ProjectBudgetVersion.Kind.PRELIMINARY
    )
    bv = ProjectBudgetVersion.objects.filter(project=project, kind=vkind).first()
    if not bv:
        return {
            'building_items': [],
            'professional_fees': [],
            'admin_expenses': [],
            'labour_costs': [],
            'machine_plants': [],
            'labour_breakdowns': [],
            'schedule_tasks': [],
            'schedule_materials': [],
            'budget_meta': {
                'kind': vkind,
                'signed_at': None,
                'signed_by_id': None,
                'signed_by_name': None,
                'author_signature': '',
                'is_locked': False,
                'version_id': None,
                'gross_total': '0.00',
                'signature_image': None,
            },
        }

    signed_name = ''
    if bv.signed_by_id:
        u = bv.signed_by
        signed_name = (u.get_full_name() or u.email or '').strip() if u else ''

    return {
        'building_items': BOQBuildingItemSerializer(bv.building_items.all(), many=True).data,
        'professional_fees': BOQProfessionalFeeSerializer(bv.professional_fees.all(), many=True).data,
        'admin_expenses': BOQAdminExpenseSerializer(bv.admin_expenses.all(), many=True).data,
        'labour_costs': BOQLabourCostSerializer(bv.labour_costs.all(), many=True).data,
        'machine_plants': BOQMachinePlantSerializer(bv.machine_plants.all(), many=True).data,
        'labour_breakdowns': BOQLabourBreakdownSerializer(bv.labour_breakdowns.all(), many=True).data,
        'schedule_tasks': BOQScheduleTaskSerializer(bv.schedule_tasks.all(), many=True).data,
        'schedule_materials': ScheduleOfMaterialSerializer(bv.schedule_materials.all(), many=True).data,
        'budget_meta': {
            'kind': bv.kind,
            'signed_at': bv.signed_at.isoformat() if bv.signed_at else None,
            'signed_by_id': bv.signed_by_id,
            'signed_by_name': signed_name,
            'author_signature': bv.author_signature or '',
            'is_locked': final_version_is_locked(bv),
            'version_id': bv.id,
            'gross_total': format_gross_total(bv),
            'signature_image': bv.signature_image or None,
        },
    }


class BudgetAggregateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def get(self, request, project_id):
        project = get_object_or_404(Project, id=project_id, owner=request.user)
        kind = request.query_params.get('budget', 'preliminary').lower()
        if kind not in ('preliminary', 'final'):
            kind = 'preliminary'
        return Response(_budget_sheets_payload(project, kind))


class PromoteFinalBudgetView(views.APIView):
    """Copy preliminary BOQ into the final budget (overwrites previous final rows, clears signature)."""
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def post(self, request, project_id):
        project = get_object_or_404(Project, id=project_id, owner=request.user)
        promote_preliminary_to_final(project)
        return Response(_budget_sheets_payload(project, 'final'))


class SignFinalBudgetView(views.APIView):
    """Sign final budget using the builder's saved profile signature (locks editing)."""
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def post(self, request, project_id):
        project = get_object_or_404(Project, id=project_id, owner=request.user)
        profile, _ = Profile.objects.get_or_create(user=request.user)
        sig_data = (profile.signature or "").strip()
        if not sig_data:
            raise ValidationError(
                "Save a digital signature under Settings → Profile before signing the final budget."
            )
        final = ProjectBudgetVersion.objects.filter(
            project=project, kind=ProjectBudgetVersion.Kind.FINAL
        ).first()
        if not final:
            raise ValidationError('Final budget does not exist yet. Promote from preliminary first.')
        n_rows = (
            final.building_items.count()
            + final.professional_fees.count()
            + final.admin_expenses.count()
            + final.labour_costs.count()
            + final.machine_plants.count()
            + final.labour_breakdowns.count()
            + final.schedule_tasks.count()
            + final.schedule_materials.count()
        )
        if n_rows == 0:
            raise ValidationError('Final budget is empty. Promote from preliminary first.')

        display_name = " ".join(
            p for p in (profile.first_name, profile.last_name) if p
        ).strip() or (
            request.user.get_full_name() or ""
        ).strip() or (request.user.email or "Signer")
        final.author_signature = display_name[:255]
        final.signature_image = sig_data
        final.signed_at = timezone.now()
        final.signed_by = request.user
        final.save(
            update_fields=[
                "author_signature",
                "signature_image",
                "signed_at",
                "signed_by",
                "updated_at",
            ]
        )
        project.is_budget_signed = True
        project.save(update_fields=['is_budget_signed'])
        return Response(_budget_sheets_payload(project, 'final'))

class BuilderConnectionsView(views.APIView):
    """
    Get all contractors and suppliers connected to the builder's projects
    """
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def get(self, request):
        user = request.user
        
        # Get all projects owned by this builder
        projects = Project.objects.filter(owner=user)
        project_ids = projects.values_list('id', flat=True)
        
        # Get unique contractors who have bids on builder's projects
        contractor_bids = Bid.objects.filter(project_id__in=project_ids).select_related('contractor', 'contractor__user', 'contractor__user__profile')
        contractors = {}
        for bid in contractor_bids:
            contractor = bid.contractor
            if contractor.id not in contractors:
                # Get average rating for this contractor
                ratings = ContractorRating.objects.filter(contractor=contractor)
                ratings_count = ratings.count()
                average_rating = float(ratings.aggregate(Avg('rating'))['rating__avg'] or 0)
                
                # Get completed projects count
                completed_projects = Project.objects.filter(
                    bids__contractor=contractor,
                    bids__status='ACCEPTED',
                    status='COMPLETED'
                ).distinct().count()
                
                contractors[contractor.id] = {
                    'id': contractor.id,
                    'company_name': contractor.company_name,
                    'license_number': contractor.license_number,
                    'created_at': contractor.created_at.isoformat() if contractor.created_at else None,
                    'updated_at': contractor.updated_at.isoformat() if contractor.updated_at else None,
                    'user': {
                        'id': contractor.user.id,
                        'email': contractor.user.email,
                        'first_name': contractor.user.first_name,
                        'last_name': contractor.user.last_name,
                        'phone_number': getattr(contractor.user.profile, 'phone_number', None) if hasattr(contractor.user, 'profile') else None,
                    },
                    'average_rating': round(average_rating, 1) if average_rating > 0 else None,
                    'ratings_count': ratings_count,
                    'completed_projects_count': completed_projects,
                    'projects': []
                }
            
            if bid.project.title not in contractors[contractor.id]['projects']:
                contractors[contractor.id]['projects'].append(bid.project.title)
        
        # Get unique suppliers who have orders on builder's projects
        supplier_orders = MaterialOrder.objects.filter(project_id__in=project_ids).select_related('supplier', 'supplier__user', 'supplier__user__profile')
        suppliers = {}
        for order in supplier_orders:
            supplier = order.supplier
            if supplier.id not in suppliers:
                suppliers[supplier.id] = {
                    'id': supplier.id,
                    'company_name': supplier.company_name,
                    'on_time_rate': float(supplier.on_time_rate),
                    'defect_rate': float(supplier.defect_rate),
                    'user': {
                        'id': supplier.user.id,
                        'email': supplier.user.email,
                        'first_name': supplier.user.first_name,
                        'last_name': supplier.user.last_name,
                        'phone_number': getattr(supplier.user.profile, 'phone_number', None) if hasattr(supplier.user, 'profile') else None,
                    },
                    'orders_count': 0,
                    'projects': []
                }
            suppliers[supplier.id]['orders_count'] += 1
            if order.project.title not in suppliers[supplier.id]['projects']:
                suppliers[supplier.id]['projects'].append(order.project.title)
        
        return Response({
            'contractors': list(contractors.values()),
            'suppliers': list(suppliers.values()),
        })

class ProjectConnectionsView(views.APIView):
    """
    Get all contractors and suppliers connected to a specific project
    """
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def get(self, request, project_id):
        try:
            project = Project.objects.get(id=project_id, owner=request.user)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=404)
        
        # Get contractors who have bids on this project
        contractor_bids = Bid.objects.filter(project=project).select_related('contractor', 'contractor__user', 'contractor__user__profile').order_by('-created_at')
        contractors = {}
        for bid in contractor_bids:
            contractor = bid.contractor
            if contractor.id not in contractors:
                contractors[contractor.id] = {
                    'id': contractor.id,
                    'company_name': contractor.company_name,
                    'license_number': contractor.license_number,
                    'user': {
                        'id': contractor.user.id,
                        'email': contractor.user.email,
                        'first_name': contractor.user.first_name,
                        'last_name': contractor.user.last_name,
                        'phone_number': getattr(contractor.user.profile, 'phone_number', None) if hasattr(contractor.user, 'profile') else None,
                    },
                    'bids_count': 0,
                    'latest_bid_status': None,
                }
            contractors[contractor.id]['bids_count'] += 1
            # Track the latest bid status (first one in ordered list is latest)
            if not contractors[contractor.id]['latest_bid_status']:
                contractors[contractor.id]['latest_bid_status'] = bid.status
        
        # Get suppliers who have orders on this project
        supplier_orders = MaterialOrder.objects.filter(project=project).select_related('supplier', 'supplier__user', 'supplier__user__profile').order_by('-created_at')
        suppliers = {}
        for order in supplier_orders:
            supplier = order.supplier
            if supplier.id not in suppliers:
                suppliers[supplier.id] = {
                    'id': supplier.id,
                    'company_name': supplier.company_name,
                    'on_time_rate': float(supplier.on_time_rate),
                    'defect_rate': float(supplier.defect_rate),
                    'user': {
                        'id': supplier.user.id,
                        'email': supplier.user.email,
                        'first_name': supplier.user.first_name,
                        'last_name': supplier.user.last_name,
                        'phone_number': getattr(supplier.user.profile, 'phone_number', None) if hasattr(supplier.user, 'profile') else None,
                    },
                    'orders_count': 0,
                    'latest_order_status': None,
                }
            suppliers[supplier.id]['orders_count'] += 1
            # Track the latest order status (first one in ordered list is latest)
            if not suppliers[supplier.id]['latest_order_status']:
                suppliers[supplier.id]['latest_order_status'] = order.status
        
        return Response({
            'contractors': list(contractors.values()),
            'suppliers': list(suppliers.values()),
        })

class AllContractorsView(views.APIView):
    """
    Get all contractors in the system for builders to browse
    """
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def get(self, request):
        contractors_list = ContractorProfile.objects.all().select_related('user', 'user__profile')
        
        contractors_data = []
        for contractor in contractors_list:
            # Get average rating from ContractorRating
            ratings = ContractorRating.objects.filter(contractor=contractor)
            ratings_count = ratings.count()
            average_rating = float(ratings.aggregate(Avg('rating'))['rating__avg'] or 0)
            
            # Get completed projects count (projects where contractor has accepted bid and project is completed)
            completed_projects = Project.objects.filter(
                bids__contractor=contractor,
                bids__status='ACCEPTED',
                status='COMPLETED'
            ).distinct().count()
            
            # Get projects this contractor has worked on (accepted bids)
            projects = list(Project.objects.filter(
                bids__contractor=contractor,
                bids__status='ACCEPTED'
            ).values_list('title', flat=True).distinct())
            
            contractors_data.append({
                'id': contractor.id,
                'company_name': contractor.company_name,
                'license_number': contractor.license_number,
                'created_at': contractor.created_at.isoformat() if contractor.created_at else None,
                'updated_at': contractor.updated_at.isoformat() if contractor.updated_at else None,
                'user': {
                    'id': contractor.user.id,
                    'email': contractor.user.email,
                    'first_name': contractor.user.first_name,
                    'last_name': contractor.user.last_name,
                    'phone_number': getattr(contractor.user.profile, 'phone_number', None) if hasattr(contractor.user, 'profile') else None,
                },
                'average_rating': round(average_rating, 1) if average_rating > 0 else None,
                'ratings_count': ratings_count,
                'completed_projects_count': completed_projects,
                'projects': projects,
            })
        
        return Response({
            'contractors': contractors_data,
        })

class IsAdminOrReadOnlyBuilder(permissions.BasePermission):
    """
    Custom permission:
    - Admin users have full CRUD access.
    - Builder users have read-only access (GET, HEAD, OPTIONS).
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False
            
        role = request.user.profile.role
        if role == 'ADMIN':
            return True
            
        if role == 'BUILDER' and request.method in permissions.SAFE_METHODS:
            return True
            
        return False

class MaterialRequestViewSet(viewsets.ModelViewSet):
    serializer_class = MaterialRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]
    pagination_class = None

    def get_queryset(self):
        qs = MaterialRequest.objects.filter(project__owner=self.request.user)
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        from django.contrib.contenttypes.models import ContentType
        project_id = self.request.data.get('project')
        category = self.request.data.get('procurement_category', 'MATERIAL')
        boq_item_id = (
            self.request.data.get('boq_source_id')
            or self.request.data.get('boq_item')
        )

        project = get_object_or_404(Project, id=project_id, owner=self.request.user)
        if not project.is_budget_signed:
            raise ValidationError(
                "Procurement is available only after the final construction budget is signed."
            )

        final_bv = ProjectBudgetVersion.objects.filter(
            project=project, kind=ProjectBudgetVersion.Kind.FINAL
        ).first()
        if not final_bv or not final_version_is_locked(final_bv):
            raise ValidationError(
                "Procurement requires a signed final budget. Sign the final budget under Construction Budget."
            )

        content_type = None
        object_id = None
        model_for_category = None
        if category == 'MATERIAL':
            model_for_category = BOQBuildingItem
        elif category == 'LABOUR':
            model_for_category = BOQLabourCost
        elif category == 'PLANT':
            model_for_category = BOQMachinePlant
        elif category == 'PROFESSIONAL':
            model_for_category = BOQProfessionalFee
        elif category == 'ADMIN':
            model_for_category = BOQAdminExpense

        boq_row_obj = None
        if boq_item_id and model_for_category is not None:
            try:
                boq_row_obj = model_for_category.objects.get(
                    pk=boq_item_id, budget_version=final_bv
                )
            except model_for_category.DoesNotExist:
                raise ValidationError(
                    {"boq_item": "This line is not part of the signed final budget."}
                )
            object_id = boq_row_obj.pk
            content_type = ContentType.objects.get_for_model(model_for_category)

        save_kwargs = {
            "project": project,
            "content_type": content_type,
            "object_id": object_id,
        }
        if category == "MATERIAL" and boq_row_obj is not None:
            save_kwargs["boq_item"] = boq_row_obj
        serializer.save(**save_kwargs)

class DrawingRequestViewSet(viewsets.ModelViewSet):
    serializer_class = DrawingRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def get_queryset(self):
        qs = DrawingRequest.objects.filter(project__owner=self.request.user).prefetch_related('files')
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        from django.shortcuts import get_object_or_404
        project_id = self.request.data.get('project')
        project = get_object_or_404(Project, id=project_id, owner=self.request.user)
        serializer.save(project=project)

class DrawingFileViewSet(viewsets.ModelViewSet):
    serializer_class = DrawingFileSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def get_queryset(self):
        return DrawingFile.objects.filter(request__project__owner=self.request.user)

    def perform_create(self, serializer):
        request_id = self.request.data.get('request')
        drawing_request = get_object_or_404(DrawingRequest, id=request_id, project__owner=self.request.user)
        serializer.save(request=drawing_request)
class ProjectTeamViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectTeamSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def get_queryset(self):
        qs = ProjectTeam.objects.filter(project__owner=self.request.user)
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        project_id = self.request.data.get('project')
        project = get_object_or_404(Project, id=project_id, owner=self.request.user)
        serializer.save(project=project)


class ProjectMilestoneViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectMilestoneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = ProjectMilestone.objects.filter(project__owner=self.request.user)
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        project_id = self.request.data.get('project')
        project = get_object_or_404(Project, id=project_id, owner=self.request.user)
        serializer.save(project=project)

    @action(detail=True, methods=['post'])
    def toggle_complete(self, request, pk=None):
        milestone = self.get_object()
        milestone.completed = not milestone.completed
        milestone.completed_date = timezone.now() if milestone.completed else None
        milestone.save()
        
        # Log activity
        ProjectActivity.objects.create(
            project=milestone.project,
            user=request.user,
            type='general',
            action='Milestone Updated',
            description=f"Milestone '{milestone.name}' marked as {'completed' if milestone.completed else 'incomplete'}"
        )
        
        return Response(self.get_serializer(milestone).data)


class ProjectActivityViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']  # Read-only except POST

    def get_queryset(self):
        qs = ProjectActivity.objects.filter(project__owner=self.request.user)
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.select_related('user', 'project')

    def perform_create(self, serializer):
        project_id = self.request.data.get('project')
        project = get_object_or_404(Project, id=project_id, owner=self.request.user)
        serializer.save(project=project, user=self.request.user)


class UserNotificationViewSet(viewsets.ModelViewSet):
    serializer_class = UserNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserNotification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.read = True
        notification.save()
        return Response({'status': 'marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        UserNotification.objects.filter(user=request.user, read=False).update(read=True)
        return Response({'status': 'all marked as read'})


class ProjectDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = ProjectDocument.objects.filter(project__owner=self.request.user)
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.select_related('uploaded_by', 'project')

    def perform_create(self, serializer):
        project_id = self.request.data.get('project')
        project = get_object_or_404(Project, id=project_id, owner=self.request.user)
        
        # Get file size
        file = self.request.FILES.get('file')
        file_size = file.size if file else 0
        
        serializer.save(
            project=project,
            uploaded_by=self.request.user,
            file_size=file_size
        )
        
        # Log activity
        ProjectActivity.objects.create(
            project=project,
            user=self.request.user,
            type='document',
            action='Document Uploaded',
            description=f"Document '{serializer.instance.name}' uploaded"
        )


class ArchitecturalDrawingView(views.APIView):
    """
    GET  /projects/<project_id>/drawing/  — load drawing state (empty {} if none)
    PUT  /projects/<project_id>/drawing/  — upsert drawing state
    """
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def _get_project(self, request, project_id):
        return get_object_or_404(Project, id=project_id, owner=request.user)

    def get(self, request, project_id):
        project = self._get_project(request, project_id)
        try:
            drawing = project.architectural_drawing
        except ArchitecturalDrawing.DoesNotExist:
            return Response({'id': None, 'project': project.id, 'data': {}})
        return Response(ArchitecturalDrawingSerializer(drawing).data)

    def put(self, request, project_id):
        project = self._get_project(request, project_id)
        drawing, _created = ArchitecturalDrawing.objects.get_or_create(
            project=project,
            defaults={'data': request.data.get('data', {})},
        )
        if not _created:
            drawing.data = request.data.get('data', {})
            drawing.save(update_fields=['data', 'updated_at'])
        return Response(ArchitecturalDrawingSerializer(drawing).data)


class PascalSceneVersionListCreateView(views.APIView):
    """
    GET  /projects/<project_id>/pascal-scenes/      — list saved Pascal scene versions
    POST /projects/<project_id>/pascal-scenes/      — save a new Pascal scene version
    """
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def _get_project(self, request, project_id):
        return get_object_or_404(Project, id=project_id, owner=request.user)

    def _get_drawing(self, project):
        drawing, _ = ArchitecturalDrawing.objects.get_or_create(
            project=project,
            defaults={'data': {}},
        )
        if not isinstance(drawing.data, dict):
            drawing.data = {}
        return drawing

    def get(self, request, project_id):
        project = self._get_project(request, project_id)
        drawing = self._get_drawing(project)
        versions = drawing.data.get('pascal_scene_versions', [])
        if not isinstance(versions, list):
            versions = []

        summary = []
        for v in versions:
            if not isinstance(v, dict):
                # Ignore legacy/corrupt list entries instead of failing the endpoint.
                continue
            scene = v.get('scene')
            nodes = scene.get('nodes', {}) if isinstance(scene, dict) else {}
            summary.append({
                'id': v.get('id'),
                'name': v.get('name') or 'Untitled Scene',
                'created_at': v.get('created_at'),
                'source': v.get('source', 'bridge'),
                'node_count': len(nodes) if isinstance(nodes, dict) else 0,
            })
        summary.sort(key=lambda x: x.get('created_at') or '', reverse=True)
        return Response({'results': summary})

    def post(self, request, project_id):
        project = self._get_project(request, project_id)
        drawing = self._get_drawing(project)

        scene = request.data.get('scene')
        if not isinstance(scene, dict):
            raise ValidationError({'scene': 'scene must be a JSON object'})

        name = (request.data.get('name') or '').strip() or f"Pascal Scene {timezone.now().strftime('%Y-%m-%d %H:%M')}"
        version_id = str(uuid.uuid4())
        created_at = timezone.now().isoformat()
        entry = {
            'id': version_id,
            'name': name[:255],
            'created_at': created_at,
            'source': request.data.get('source') or 'bridge',
            'scene': scene,
        }

        data = drawing.data if isinstance(drawing.data, dict) else {}
        versions = data.get('pascal_scene_versions', [])
        if not isinstance(versions, list):
            versions = []
        versions.append(entry)
        data['pascal_scene_versions'] = versions[-25:]  # keep recent 25 versions max
        drawing.data = data
        drawing.save(update_fields=['data', 'updated_at'])

        return Response(
            {
                'id': version_id,
                'name': entry['name'],
                'created_at': created_at,
                'source': entry['source'],
            },
            status=status.HTTP_201_CREATED
        )


class PascalSceneVersionDetailView(views.APIView):
    """
    GET /projects/<project_id>/pascal-scenes/<scene_id>/   — fetch full scene JSON
    """
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def _get_project(self, request, project_id):
        return get_object_or_404(Project, id=project_id, owner=request.user)

    def get(self, request, project_id, scene_id):
        project = self._get_project(request, project_id)
        try:
            drawing = project.architectural_drawing
        except ArchitecturalDrawing.DoesNotExist:
            return Response({'detail': 'Scene not found'}, status=status.HTTP_404_NOT_FOUND)

        versions = drawing.data.get('pascal_scene_versions', []) if isinstance(drawing.data, dict) else []
        for v in versions:
            if isinstance(v, dict) and v.get('id') == scene_id:
                return Response({
                    'id': v.get('id'),
                    'name': v.get('name'),
                    'created_at': v.get('created_at'),
                    'source': v.get('source', 'bridge'),
                    'scene': v.get('scene', {}),
                })
        return Response({'detail': 'Scene not found'}, status=status.HTTP_404_NOT_FOUND)


class BudgetAnalysisHistoryViewSet(viewsets.ModelViewSet):
    """CRUD for Budget Engineer analysis history entries."""
    serializer_class = BudgetAnalysisHistorySerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = BudgetAnalysisHistory.objects.filter(project__owner=self.request.user)
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.select_related('user', 'project')

    def perform_create(self, serializer):
        project_id = self.request.data.get('project')
        project = get_object_or_404(Project, id=project_id, owner=self.request.user)
        serializer.save(project=project, user=self.request.user)

class MaterialPoolViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Exposes active bulk supply chain pools. Builder reads these and links commitments.
    """
    serializer_class = MaterialPoolSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def get_queryset(self):
        # Admin might see all, Builders see OPEN or LOCKED for joining/viewing
        return MaterialPool.objects.all()

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        pool = self.get_object()
        project_id = request.data.get('projectId')
        qty = request.data.get('quantity')
        
        if not project_id or not qty:
            return Response({"detail": "project_id and quantity are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            qty = float(qty)
        except ValueError:
            return Response({"detail": "quantity must be a valid number"}, status=status.HTTP_400_BAD_REQUEST)
            
        project = get_object_or_404(Project, id=project_id, owner=request.user)
        
        deposit_amount = qty * 5.00 # Simulated $5/unit deposit lock
        
        commitment = MaterialPoolCommitment.objects.create(
            pool=pool,
            project=project,
            quantity=qty,
            deposit_paid=deposit_amount,
            status='LOCKED'
        )
        
        pool.current_volume += qty
        if pool.current_volume >= pool.moq:
            pool.status = 'LOCKED'
        pool.save()
        
        # Calculate savings logic
        savings_per_unit = float(pool.tier_2_discount) if pool.tier_2_discount else 0.0
        total_savings = qty * savings_per_unit
        
        # Log deduction to budget history if total_savings > 0
        if total_savings > 0:
            BOQCorrection.objects.create(
                project=project,
                user=request.user,
                action='CREATE',
                was_ai_generated=False,
                new_data={
                    "item": f"Material Pool Wholesale Deduction: {pool.name}",
                    "amount": -total_savings,
                    "pool_id": pool.id,
                    "quantity": qty
                }
            )
        
        return Response(MaterialPoolCommitmentSerializer(commitment).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def commitments(self, request):
        project_id = request.query_params.get('project_id')
        qs = MaterialPoolCommitment.objects.filter(project__owner=request.user)
        if project_id:
            qs = qs.filter(project_id=project_id)
            
        return Response(MaterialPoolCommitmentSerializer(qs, many=True).data)

    @action(detail=False, methods=['post'])
    def cancel_commitment(self, request):
        commitment_id = request.data.get('commitmentId')
        commitment = get_object_or_404(MaterialPoolCommitment, id=commitment_id, project__owner=request.user)
        
        if commitment.status != 'LOCKED':
            return Response({"detail": "Only locked commitments can be cancelled"}, status=status.HTTP_400_BAD_REQUEST)
            
        pool = commitment.pool
        pool.current_volume -= commitment.quantity
        if pool.current_volume < pool.moq and pool.status == 'LOCKED':
            pool.status = 'OPEN'
        pool.save()
        
        commitment.status = 'CANCELLED'
        commitment.save()
        
        return Response({"detail": "Successfully cancelled commitment"})

