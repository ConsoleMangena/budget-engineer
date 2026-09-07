from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SupplierProfileViewSet, ProductViewSet, MaterialOrderViewSet, DeliveryViewSet

router = DefaultRouter()
router.register(r'supplier-profiles', SupplierProfileViewSet, basename='supplierprofile')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'material-orders', MaterialOrderViewSet, basename='materialorder')
router.register(r'deliveries', DeliveryViewSet, basename='delivery')

urlpatterns = [
    path('', include(router.urls)),
]
