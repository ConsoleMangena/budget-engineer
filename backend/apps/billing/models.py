from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class SubscriptionPlan(models.Model):
    """
    Defines available subscription plans (Free, Professional, Enterprise)
    """
    PLAN_CHOICES = [
        ('FREE', 'Free'),
        ('PROFESSIONAL', 'Professional'),
        ('ENTERPRISE', 'Enterprise'),
    ]
    
    name = models.CharField(max_length=50, choices=PLAN_CHOICES, unique=True)
    display_name = models.CharField(max_length=100)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Plan features
    max_projects = models.IntegerField(help_text="Maximum number of active projects, -1 for unlimited")
    storage_gb = models.IntegerField(help_text="Storage limit in GB")
    support_level = models.CharField(max_length=50, default="Basic")
    
    # Feature flags
    has_analytics = models.BooleanField(default=False)
    has_custom_branding = models.BooleanField(default=False)
    has_custom_integration = models.BooleanField(default=False)
    has_dedicated_manager = models.BooleanField(default=False)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.display_name} - ${self.price}/month"
    
    class Meta:
        ordering = ['price']


class Subscription(models.Model):
    """
    User subscription to a plan
    """
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('CANCELLED', 'Cancelled'),
        ('PAST_DUE', 'Past Due'),
        ('TRIALING', 'Trialing'),
        ('EXPIRED', 'Expired'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name='subscriptions')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    
    # Billing dates
    start_date = models.DateTimeField(default=timezone.now)
    current_period_start = models.DateTimeField(default=timezone.now)
    current_period_end = models.DateTimeField()
    cancel_at_period_end = models.BooleanField(default=False)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    
    # Payment provider info
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.plan.display_name} ({self.status})"
    
    def is_active(self):
        return self.status == 'ACTIVE' and self.current_period_end > timezone.now()
    
    class Meta:
        ordering = ['-created_at']


class BillingAddress(models.Model):
    """
    User billing address information
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='billing_address')
    
    # Address fields
    street_address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100, default='Zimbabwe')
    
    # Contact information
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.city}, {self.country}"
    
    class Meta:
        verbose_name = 'Billing Address'
        verbose_name_plural = 'Billing Addresses'


class PaymentMethod(models.Model):
    """
    Stores user payment methods (credit cards, etc.)
    Note: Full card numbers are NEVER stored. Only tokenized payment method IDs from payment processors.
    """
    CARD_BRANDS = [
        ('VISA', 'Visa'),
        ('MASTERCARD', 'Mastercard'),
        ('AMEX', 'American Express'),
        ('DISCOVER', 'Discover'),
        ('OTHER', 'Other'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_methods')
    
    # Card information (only last 4 digits stored for display)
    card_brand = models.CharField(max_length=20, choices=CARD_BRANDS)
    last_four = models.CharField(max_length=4)
    exp_month = models.IntegerField()
    exp_year = models.IntegerField()
    
    is_default = models.BooleanField(default=False)
    
    # Payment provider info (tokenized payment method ID - NEVER store full card numbers)
    stripe_payment_method_id = models.CharField(max_length=255, blank=True, null=True)
    payment_token = models.CharField(max_length=255, blank=True, null=True, help_text="Tokenized payment method from secure payment processor")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.card_brand} ending in {self.last_four}"
    
    class Meta:
        ordering = ['-is_default', '-created_at']


class Invoice(models.Model):
    """
    Billing invoices
    """
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('OPEN', 'Open'),
        ('PAID', 'Paid'),
        ('VOID', 'Void'),
        ('UNCOLLECTIBLE', 'Uncollectible'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invoices')
    subscription = models.ForeignKey(Subscription, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    
    invoice_number = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    
    # Amounts
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Dates
    invoice_date = models.DateTimeField(default=timezone.now)
    due_date = models.DateTimeField()
    paid_at = models.DateTimeField(null=True, blank=True)
    
    # Payment provider info
    stripe_invoice_id = models.CharField(max_length=255, blank=True, null=True)
    invoice_pdf_url = models.URLField(blank=True, null=True)

    # Customer display fields (optional)
    customer_name = models.CharField(max_length=255, blank=True, default='')
    company_name = models.CharField(max_length=255, blank=True, default='')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Invoice {self.invoice_number} - ${self.total}"
    
    class Meta:
        ordering = ['-invoice_date']


# ── Accounting (COA + Journal) ────────────────────────────────────────────────

class ChartOfAccount(models.Model):
    ACCOUNT_TYPES = [
        ('ASSET', 'Asset'),
        ('LIABILITY', 'Liability'),
        ('EQUITY', 'Equity'),
        ('REVENUE', 'Revenue'),
        ('EXPENSE', 'Expense'),
    ]

    code = models.CharField(max_length=20, unique=True, help_text="e.g. 1000")
    name = models.CharField(max_length=255, help_text="e.g. Cash")
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES)
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.code} — {self.name}"


class JournalEntry(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('POSTED', 'Posted'),
        ('VOID', 'Void'),
    ]

    reference = models.CharField(max_length=100, blank=True, default='', help_text="External reference (invoice, procurement id, etc.)")
    memo = models.CharField(max_length=255, blank=True, default='')
    entry_date = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='journal_entries_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-entry_date', '-created_at']

    def __str__(self):
        return f"JE#{self.id} {self.entry_date.date()} ({self.status})"


class JournalLine(models.Model):
    entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='lines')
    account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, related_name='journal_lines')
    description = models.CharField(max_length=255, blank=True, default='')
    debit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.account.code} {self.debit}/{self.credit}"
