from django.contrib import admin
from .models import SubscriptionPlan, Subscription, PaymentMethod, Invoice, BillingAddress


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'name', 'price', 'max_projects', 'storage_gb', 'is_active']
    list_filter = ['is_active', 'name']
    search_fields = ['display_name', 'description']


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'plan', 'status', 'current_period_start', 'current_period_end', 'cancel_at_period_end']
    list_filter = ['status', 'plan', 'cancel_at_period_end']
    search_fields = ['user__username', 'user__email', 'stripe_subscription_id']
    date_hierarchy = 'created_at'


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ['user', 'card_brand', 'last_four', 'exp_month', 'exp_year', 'is_default']
    list_filter = ['card_brand', 'is_default']
    search_fields = ['user__username', 'user__email', 'last_four']


@admin.register(BillingAddress)
class BillingAddressAdmin(admin.ModelAdmin):
    list_display = ['user', 'city', 'state', 'country', 'postal_code']
    list_filter = ['country', 'state']
    search_fields = ['user__username', 'user__email', 'street_address', 'city', 'postal_code']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'user', 'status', 'total', 'invoice_date', 'due_date', 'paid_at']
    list_filter = ['status', 'invoice_date']
    search_fields = ['invoice_number', 'user__username', 'user__email', 'stripe_invoice_id']
    date_hierarchy = 'invoice_date'
