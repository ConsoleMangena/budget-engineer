from django.contrib import admin
from .models import (
    ChatSession, ChatMessage,
    MaterialPrice, TokenUsage,
    BOQTemplate,
)

class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ('role', 'content', 'image_url', 'created_at')

@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'created_at', 'updated_at')
    list_filter = ('created_at',)
    search_fields = ('title', 'user__email', 'user__username')
    inlines = [ChatMessageInline]



@admin.register(MaterialPrice)
class MaterialPriceAdmin(admin.ModelAdmin):
    list_display = ('material', 'unit', 'price', 'currency', 'region', 'supplier_name', 'updated_at')
    list_filter = ('currency', 'region')
    search_fields = ('material', 'supplier_name')
    list_editable = ('price', 'currency')


@admin.register(TokenUsage)
class TokenUsageAdmin(admin.ModelAdmin):
    list_display = ('user', 'endpoint', 'model_name', 'input_tokens', 'output_tokens', 'total_tokens', 'created_at')
    list_filter = ('endpoint', 'model_name', 'created_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('user', 'session', 'endpoint', 'model_name', 'input_tokens', 'output_tokens', 'total_tokens')
    date_hierarchy = 'created_at'


@admin.register(BOQTemplate)
class BOQTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'include_labour_rate', 'include_measurement_formula', 'updated_at')
    list_filter = ('is_active',)
    list_editable = ('is_active',)
    fieldsets = (
        (None, {
            'fields': ('name', 'is_active'),
        }),
        ('Category Ordering', {
            'description': 'Define the order in which BOQ categories should appear. One per line, numbered.',
            'fields': ('category_order',),
        }),
        ('Extraction Rules', {
            'description': 'Tell the AI exactly what to extract from floor plans and how to measure each element.',
            'fields': ('extraction_rules',),
        }),
        ('Example Items (Few-Shot)', {
            'description': (
                'Paste a JSON array of example BOQ items. The AI will mimic this naming style, '
                'description detail, and categorisation. TIP: copy a few rows from your existing BOQ spreadsheet.'
            ),
            'fields': ('example_items_json',),
        }),
        ('Optional Columns', {
            'fields': ('include_labour_rate', 'include_measurement_formula'),
        }),
        ('Export Header / Footer', {
            'classes': ('collapse',),
            'fields': ('header_text', 'footer_text'),
        }),
    )

