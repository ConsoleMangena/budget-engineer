from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubscriptionPlanViewSet,
    SubscriptionViewSet,
    PaymentMethodViewSet,
    InvoiceViewSet,
    BillingAddressViewSet
)

router = DefaultRouter()
router.register(r'plans', SubscriptionPlanViewSet, basename='subscription-plan')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'payment-methods', PaymentMethodViewSet, basename='payment-method')
router.register(r'billing-address', BillingAddressViewSet, basename='billing-address')
router.register(r'invoices', InvoiceViewSet, basename='invoice')

urlpatterns = [
    path('', include(router.urls)),
]
