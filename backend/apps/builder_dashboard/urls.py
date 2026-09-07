from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProjectViewSet, SiteUpdateViewSet, BuilderConnectionsView,
    ProjectConnectionsView, AllContractorsView, ProjectDashboardView,
    EscrowMilestoneViewSet, CapitalScheduleViewSet, MaterialAuditViewSet,
    WeatherEventViewSet, ESignatureRequestViewSet, SiteCameraViewSet,
    MaterialRequestViewSet, DrawingRequestViewSet, DrawingFileViewSet, ProjectTeamViewSet,
    BOQBuildingItemViewSet, BOQProfessionalFeeViewSet, BOQAdminExpenseViewSet,
    BOQLabourCostViewSet, BOQMachinePlantViewSet, BOQLabourBreakdownViewSet,
    BOQScheduleTaskViewSet, BudgetAggregateView, ScheduleOfMaterialViewSet,
    PromoteFinalBudgetView, SignFinalBudgetView,
    ProjectMilestoneViewSet, ProjectActivityViewSet, UserNotificationViewSet,
    ProjectDocumentViewSet, ArchitecturalDrawingView,
    BudgetAnalysisHistoryViewSet, MaterialPoolViewSet,
    PascalSceneVersionListCreateView, PascalSceneVersionDetailView
)

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'site-updates', SiteUpdateViewSet, basename='siteupdate')
router.register(r'escrow-milestones', EscrowMilestoneViewSet, basename='escrowmilestone')
router.register(r'capital-schedules', CapitalScheduleViewSet, basename='capitalschedule')
router.register(r'material-audits', MaterialAuditViewSet, basename='materialaudit')
router.register(r'weather-events', WeatherEventViewSet, basename='weatherevent')
router.register(r'esignature-requests', ESignatureRequestViewSet, basename='esignaturerequest')
router.register(r'site-cameras', SiteCameraViewSet, basename='sitecamera')
router.register(r'boq-building-items', BOQBuildingItemViewSet, basename='boqbuildingitem')
router.register(r'boq-professional-fees', BOQProfessionalFeeViewSet, basename='boqprofessionalfee')
router.register(r'boq-admin-expenses', BOQAdminExpenseViewSet, basename='boqadminexpense')
router.register(r'boq-labour-costs', BOQLabourCostViewSet, basename='boqlabourcost')
router.register(r'boq-machine-plants', BOQMachinePlantViewSet, basename='boqmachineplant')
router.register(r'boq-labour-breakdowns', BOQLabourBreakdownViewSet, basename='boqlabourbreakdown')
router.register(r'boq-schedule-tasks', BOQScheduleTaskViewSet, basename='boqscheduletask')
router.register(r'schedule-materials', ScheduleOfMaterialViewSet, basename='schedulematerial')
router.register(r'material-requests', MaterialRequestViewSet, basename='materialrequest')
router.register(r'drawing-requests', DrawingRequestViewSet, basename='drawingrequest')
router.register(r'drawing-files', DrawingFileViewSet, basename='drawingfile')
router.register(r'project-team', ProjectTeamViewSet, basename='projectteam')
router.register(r'project-milestones', ProjectMilestoneViewSet, basename='projectmilestone')
router.register(r'project-activities', ProjectActivityViewSet, basename='projectactivity')
router.register(r'notifications', UserNotificationViewSet, basename='notification')
router.register(r'project-documents', ProjectDocumentViewSet, basename='projectdocument')
router.register(r'budget-analysis-history', BudgetAnalysisHistoryViewSet, basename='budgetanalysishistory')
router.register(r'material-pools', MaterialPoolViewSet, basename='materialpool')

urlpatterns = [
    path('', include(router.urls)),
    path('projects/<int:project_id>/budget-sheets/', BudgetAggregateView.as_view(), name='budget-aggregate'),
    path('projects/<int:project_id>/budget/promote-to-final/', PromoteFinalBudgetView.as_view(), name='budget-promote-final'),
    path('projects/<int:project_id>/budget/sign-final/', SignFinalBudgetView.as_view(), name='budget-sign-final'),
    path('projects/<int:pk>/dashboard/', ProjectDashboardView.as_view(), name='project-dashboard'),
    path('builder-connections/', BuilderConnectionsView.as_view(), name='builder-connections'),
    path('projects/<int:project_id>/connections/', ProjectConnectionsView.as_view(), name='project-connections'),
    path('all-contractors/', AllContractorsView.as_view(), name='all-contractors'),
    path('projects/<int:project_id>/drawing/', ArchitecturalDrawingView.as_view(), name='architectural-drawing'),
    path('projects/<int:project_id>/pascal-scenes/', PascalSceneVersionListCreateView.as_view(), name='pascal-scenes'),
    path('projects/<int:project_id>/pascal-scenes/<str:scene_id>/', PascalSceneVersionDetailView.as_view(), name='pascal-scene-detail'),
]
