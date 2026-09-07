from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ContractorProfileViewSet, BidViewSet, WIPAAViewSet, ProfessionalProfileViewSet

router = DefaultRouter()
router.register(r'contractor-profiles', ContractorProfileViewSet, basename='contractorprofile')
router.register(r'bids', BidViewSet, basename='bid')
router.register(r'wipaa', WIPAAViewSet, basename='wipaa')
router.register(r'professionals', ProfessionalProfileViewSet, basename='professionalprofile')

urlpatterns = [
    path('', include(router.urls)),
]
