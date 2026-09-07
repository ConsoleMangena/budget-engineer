from django.db import models
from apps.core.models import TimeStampedModel
from apps.builder_dashboard.models import Project

class ArchitecturalStudioItem(TimeStampedModel):
    DRAWING_TYPE_CHOICES = [
        ('blueprint', 'Technical Blueprint'),
        ('3d_render', '3D Render'),
        ('perspective', 'Perspective View'),
        ('elevation', 'Elevation'),
        ('section', 'Section'),
        ('other', 'Other'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='architectural_studio_items')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    file = models.FileField(upload_to='architectural_studio/%Y/%m/')
    category = models.CharField(max_length=20, choices=DRAWING_TYPE_CHOICES, default='blueprint')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.project.title} - {self.title} ({self.get_category_display()})"
