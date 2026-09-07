from django.db import models

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class LegalDocument(TimeStampedModel):
    """
    Stores Terms of Service and Privacy Policy content
    """
    DOCUMENT_TYPE_CHOICES = [
        ('TERMS', 'Terms of Service'),
        ('PRIVACY', 'Privacy Policy'),
    ]
    
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPE_CHOICES, unique=True)
    title = models.CharField(max_length=255)
    content = models.TextField(help_text="Full content of the document")
    is_active = models.BooleanField(default=True, help_text="Only active documents are shown to users")
    
    class Meta:
        ordering = ['document_type']
        verbose_name = 'Legal Document'
        verbose_name_plural = 'Legal Documents'
    
    def __str__(self):
        return f"{self.get_document_type_display()} - {self.title}"


class HelpCenterCategory(TimeStampedModel):
    """
    Categories for help center articles
    """
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, help_text="URL-friendly identifier")
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, null=True, help_text="Icon name (e.g., 'HelpCircle')")
    order = models.IntegerField(default=0, help_text="Display order")
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['order', 'name']
        verbose_name = 'Help Center Category'
        verbose_name_plural = 'Help Center Categories'
    
    def __str__(self):
        return self.name


class HelpCenterArticle(TimeStampedModel):
    """
    Help center articles/FAQ items
    """
    category = models.ForeignKey(HelpCenterCategory, on_delete=models.CASCADE, related_name='articles')
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, help_text="URL-friendly identifier")
    content = models.TextField(help_text="Full content of the article")
    excerpt = models.TextField(blank=True, null=True, help_text="Short summary for preview")
    order = models.IntegerField(default=0, help_text="Display order within category")
    is_featured = models.BooleanField(default=False, help_text="Show in featured section")
    is_active = models.BooleanField(default=True)
    views_count = models.IntegerField(default=0, help_text="Number of times viewed")
    
    class Meta:
        ordering = ['category', 'order', 'title']
        verbose_name = 'Help Center Article'
        verbose_name_plural = 'Help Center Articles'
    
    def __str__(self):
        return f"{self.category.name} - {self.title}"


class FAQ(TimeStampedModel):
    """
    Frequently Asked Questions
    """
    question = models.CharField(max_length=500)
    answer = models.TextField(help_text="Full answer to the question")
    category = models.ForeignKey(
        HelpCenterCategory, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='faqs',
        help_text="Optional category for grouping FAQs"
    )
    order = models.IntegerField(default=0, help_text="Display order")
    is_active = models.BooleanField(default=True)
    views_count = models.IntegerField(default=0, help_text="Number of times viewed")
    
    class Meta:
        ordering = ['category', 'order', 'question']
        verbose_name = 'FAQ'
        verbose_name_plural = 'FAQs'
    
    def __str__(self):
        return self.question


