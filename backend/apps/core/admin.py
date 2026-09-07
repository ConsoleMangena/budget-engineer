from django.contrib import admin
from .models import LegalDocument, HelpCenterCategory, HelpCenterArticle, FAQ

@admin.register(LegalDocument)
class LegalDocumentAdmin(admin.ModelAdmin):
    list_display = ['document_type', 'title', 'is_active', 'created_at', 'updated_at']
    list_filter = ['document_type', 'is_active']
    search_fields = ['title', 'content']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Document Information', {
            'fields': ('document_type', 'title', 'is_active')
        }),
        ('Content', {
            'fields': ('content',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(HelpCenterCategory)
class HelpCenterCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'order', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['created_at', 'updated_at']


@admin.register(HelpCenterArticle)
class HelpCenterArticleAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'order', 'is_featured', 'is_active', 'views_count', 'created_at']
    list_filter = ['category', 'is_featured', 'is_active']
    search_fields = ['title', 'content', 'excerpt']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['created_at', 'updated_at', 'views_count']
    fieldsets = (
        ('Article Information', {
            'fields': ('category', 'title', 'slug', 'excerpt', 'is_featured', 'is_active', 'order')
        }),
        ('Content', {
            'fields': ('content',)
        }),
        ('Statistics', {
            'fields': ('views_count',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ['question', 'category', 'order', 'is_active', 'views_count', 'created_at']
    list_filter = ['category', 'is_active']
    search_fields = ['question', 'answer']
    readonly_fields = ['created_at', 'updated_at', 'views_count']
    fieldsets = (
        ('FAQ Information', {
            'fields': ('category', 'question', 'order', 'is_active')
        }),
        ('Answer', {
            'fields': ('answer',)
        }),
        ('Statistics', {
            'fields': ('views_count',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

