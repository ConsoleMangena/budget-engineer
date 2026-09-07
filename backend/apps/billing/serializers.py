from rest_framework import serializers
from .models import SubscriptionPlan, Subscription, PaymentMethod, Invoice, BillingAddress


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    features = serializers.SerializerMethodField()
    
    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'display_name', 'description', 'price',
            'max_projects', 'storage_gb', 'support_level',
            'features', 'is_active'
        ]
    
    def get_features(self, obj):
        """Return list of features based on plan capabilities"""
        features = []
        
        # Project limit
        if obj.max_projects == -1:
            features.append('Unlimited Projects')
        else:
            features.append(f'{obj.max_projects} Active Project{"s" if obj.max_projects > 1 else ""}')
        
        # Support
        features.append(f'{obj.support_level} Support')
        
        # Storage
        features.append(f'{obj.storage_gb}GB Storage')
        
        # Optional features
        if obj.has_analytics:
            features.append('Advanced Analytics')
        if obj.has_custom_branding:
            features.append('Custom Branding')
        if obj.has_custom_integration:
            features.append('Custom Integration')
        if obj.has_dedicated_manager:
            features.append('Dedicated Account Manager')
        
        # Always include community access for free tier
        if obj.name == 'FREE':
            features.append('Community Access')
        
        return features


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = SubscriptionPlanSerializer(read_only=True)
    plan_id = serializers.PrimaryKeyRelatedField(
        queryset=SubscriptionPlan.objects.all(),
        source='plan',
        write_only=True
    )
    is_active = serializers.SerializerMethodField()
    
    class Meta:
        model = Subscription
        fields = [
            'id', 'plan', 'plan_id', 'status', 'start_date',
            'current_period_start', 'current_period_end',
            'cancel_at_period_end', 'cancelled_at', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['start_date', 'current_period_start', 'current_period_end', 'created_at', 'updated_at']
    
    def get_is_active(self, obj):
        return obj.is_active()


class BillingAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillingAddress
        fields = [
            'id', 'street_address', 'city', 'state', 'postal_code', 'country', 'phone_number',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = [
            'id', 'card_brand', 'last_four', 'exp_month', 'exp_year',
            'is_default', 'created_at'
        ]
        read_only_fields = ['created_at']


class PaymentMethodCreateSerializer(serializers.Serializer):
    """
    Serializer for creating payment methods
    Note: Card numbers should be tokenized by payment processor (e.g., Stripe) before sending to backend
    """
    payment_token = serializers.CharField(required=True, help_text="Tokenized payment method from secure payment processor")
    card_brand = serializers.ChoiceField(choices=PaymentMethod.CARD_BRANDS, required=True)
    last_four = serializers.CharField(max_length=4, required=True)
    exp_month = serializers.IntegerField(min_value=1, max_value=12, required=True)
    exp_year = serializers.IntegerField(required=True)
    is_default = serializers.BooleanField(default=False)
    
    def validate_last_four(self, value):
        if not value.isdigit() or len(value) != 4:
            raise serializers.ValidationError("Last four digits must be exactly 4 digits")
        return value


class InvoiceSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='subscription.plan.display_name', read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'status', 'plan_name',
            'subtotal', 'tax', 'total', 'amount_paid',
            'invoice_date', 'due_date', 'paid_at',
            'invoice_pdf_url', 'created_at'
        ]
        read_only_fields = ['invoice_number', 'created_at']
