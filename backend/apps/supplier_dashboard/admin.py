from django.contrib import admin
from .models import SupplierProfile, Product, MaterialOrder, Delivery


@admin.register(SupplierProfile)
class SupplierProfileAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'user', 'on_time_rate', 'defect_rate', 'created_at')
    search_fields = ('company_name', 'user__email')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'supplier', 'unit_price', 'created_at')
    list_filter = ('supplier',)
    search_fields = ('name', 'description', 'supplier__company_name')


@admin.register(MaterialOrder)
class MaterialOrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'project', 'supplier', 'total_cost', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('project__title', 'supplier__company_name')


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'date', 'verified', 'created_at')
    list_filter = ('verified', 'date')
    search_fields = ('order__id',)
