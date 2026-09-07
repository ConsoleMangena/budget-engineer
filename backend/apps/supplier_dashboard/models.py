from django.db import models
from django.conf import settings
from apps.builder_dashboard.models import Project
from apps.core.models import TimeStampedModel

class SupplierProfile(TimeStampedModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='supplier_profile')
    company_name = models.CharField(max_length=255)
    on_time_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Percentage of on-time deliveries")
    defect_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Percentage of defective items")

    def __str__(self):
        return self.company_name

class Product(TimeStampedModel):
    supplier = models.ForeignKey(SupplierProfile, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return self.name

class MaterialOrder(TimeStampedModel):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('SHIPPED', 'Shipped'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='material_orders')
    supplier = models.ForeignKey(SupplierProfile, on_delete=models.CASCADE, related_name='orders')
    total_cost = models.DecimalField(max_digits=12, decimal_places=2)
    tco_score = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, help_text="Total Cost of Ownership Score")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    def __str__(self):
        return f"Order #{self.id} for {self.project.title}"

class Delivery(TimeStampedModel):
    order = models.ForeignKey(MaterialOrder, on_delete=models.CASCADE, related_name='deliveries')
    date = models.DateTimeField()
    proof_of_delivery = models.ImageField(upload_to='deliveries/', help_text="Image proof for escrow release")
    verified = models.BooleanField(default=False)

    def __str__(self):
        return f"Delivery for Order #{self.order.id}"
