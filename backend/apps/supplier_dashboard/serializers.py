from rest_framework import serializers
from .models import SupplierProfile, Product, MaterialOrder, Delivery

class SupplierProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierProfile
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')

class MaterialOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterialOrder
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')

class DeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = Delivery
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
