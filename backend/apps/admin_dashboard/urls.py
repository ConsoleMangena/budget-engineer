from django.urls import path
from .views import (
    AdminUserManagementView, AccountRequestView, SystemMetricsView, AIAnalyticsView,
    FloorPlanCategoryView, FloorPlanDatasetView,
    AdminProjectsView, AdminBillingView,
    PlatformSettingsView, AdminActivityLogView,
    UserActivityEventView, AdminUserActivityView,
    AdminUserAuditLogView,
    AdminProcurementView, AdminProfessionalManagementView,
    AdminChartOfAccountsView, AdminAccountLedgerView, AdminJournalEntriesView, AdminJournalEntryPostView,
    AdminFinanceReportsView,
)

urlpatterns = [
    path('metrics/', SystemMetricsView.as_view(), name='admin-metrics'),
    path('users/', AdminUserManagementView.as_view(), name='admin-users'),
    path('users/<int:pk>/', AdminUserManagementView.as_view(), name='admin-users-detail'),
    path('users/<int:pk>/activity/', AdminUserActivityView.as_view(), name='admin-user-activity'),
    path('requests/', AccountRequestView.as_view(), name='account-requests'),
    path('requests/<int:pk>/', AccountRequestView.as_view(), name='account-requests-detail'),
    path('ai-analytics/', AIAnalyticsView.as_view(), name='admin-ai-analytics'),
    # Floor Plans
    path('floor-plan-categories/', FloorPlanCategoryView.as_view(), name='admin-floor-plan-categories'),
    path('floor-plan-categories/<int:pk>/', FloorPlanCategoryView.as_view(), name='admin-floor-plan-categories-detail'),
    path('floor-plans/', FloorPlanDatasetView.as_view(), name='admin-floor-plans'),
    path('floor-plans/<int:pk>/', FloorPlanDatasetView.as_view(), name='admin-floor-plans-detail'),
    # Projects
    path('projects/', AdminProjectsView.as_view(), name='admin-projects'),
    path('projects/<int:pk>/', AdminProjectsView.as_view(), name='admin-projects-detail'),
    # Billing
    path('billing/', AdminBillingView.as_view(), name='admin-billing'),
    # Finance (Accounting)
    path('finance/accounts/', AdminChartOfAccountsView.as_view(), name='admin-finance-accounts'),
    path('finance/accounts/<int:pk>/ledger/', AdminAccountLedgerView.as_view(), name='admin-finance-account-ledger'),
    path('finance/journal-entries/', AdminJournalEntriesView.as_view(), name='admin-finance-journal-entries'),
    path('finance/journal-entries/<int:pk>/post/', AdminJournalEntryPostView.as_view(), name='admin-finance-journal-post'),
    path('finance/reports/', AdminFinanceReportsView.as_view(), name='admin-finance-reports'),
    # Settings
    path('settings/', PlatformSettingsView.as_view(), name='admin-settings'),
    # Activity Log
    path('activity-log/', AdminActivityLogView.as_view(), name='admin-activity-log'),
    # User audit log (one row per user)
    path('audit-log/', AdminUserAuditLogView.as_view(), name='admin-audit-log'),
    # User activity tracking (page views etc.)
    path('activity/', UserActivityEventView.as_view(), name='user-activity-event'),
    # Procurement Oversight
    path('procurement/', AdminProcurementView.as_view(), name='admin-procurement'),
    # Building Team (Professionals)
    path('professional-profiles/', AdminProfessionalManagementView.as_view(), name='admin-professionals'),
    path('professional-profiles/<int:pk>/', AdminProfessionalManagementView.as_view(), name='admin-professionals-detail'),
]
