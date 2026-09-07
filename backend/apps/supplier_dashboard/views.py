from rest_framework import viewsets, permissions, exceptions
from .models import SupplierProfile, Product, MaterialOrder, Delivery
from .serializers import SupplierProfileSerializer, ProductSerializer, MaterialOrderSerializer, DeliverySerializer
from apps.authentication.permissions import IsSupplier

class SupplierProfileViewSet(viewsets.ModelViewSet):
    serializer_class = SupplierProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsSupplier]

    def get_queryset(self):
        return SupplierProfile.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        if SupplierProfile.objects.filter(user=self.request.user).exists():
            raise exceptions.ValidationError("Profile already exists for this user.")
        serializer.save(user=self.request.user)

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated, IsSupplier]

    def get_queryset(self):
        return Product.objects.filter(supplier__user=self.request.user)

    def perform_create(self, serializer):
        try:
            supplier = self.request.user.supplier_profile
        except SupplierProfile.DoesNotExist:
            raise exceptions.ValidationError("User does not have a supplier profile.")
        serializer.save(supplier=supplier)

class MaterialOrderViewSet(viewsets.ModelViewSet):
    serializer_class = MaterialOrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsSupplier]

    def get_queryset(self):
        return MaterialOrder.objects.filter(supplier__user=self.request.user)

class DeliveryViewSet(viewsets.ModelViewSet):
    serializer_class = DeliverySerializer
    permission_classes = [permissions.IsAuthenticated, IsSupplier]

    def get_queryset(self):
        return Delivery.objects.filter(order__supplier__user=self.request.user)
