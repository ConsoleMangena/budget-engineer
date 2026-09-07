from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ArchitecturalStudioItemViewSet, elevation_grid

router = DefaultRouter()
router.register(r'items', ArchitecturalStudioItemViewSet, basename='studioitem')

urlpatterns = [
    path('', include(router.urls)),
    path('elevation-grid/', elevation_grid, name='elevation-grid'),
]
