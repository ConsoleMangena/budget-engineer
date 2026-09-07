from django.contrib import admin
from .models import ContractorProfile, Bid, WIPAA, ContractorRating


@admin.register(ContractorProfile)
class ContractorProfileAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'user', 'license_number', 'created_at')
    search_fields = ('company_name', 'user__email', 'license_number')


@admin.register(Bid)
class BidAdmin(admin.ModelAdmin):
    list_display = ('project', 'contractor', 'total_amount', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('project__title', 'contractor__company_name')


@admin.register(WIPAA)
class WIPAAAdmin(admin.ModelAdmin):
    list_display = ('project', 'contractor', 'period', 'billed_revenue', 'earned_revenue')
    list_filter = ('period',)
    search_fields = ('project__title', 'contractor__company_name')


@admin.register(ContractorRating)
class ContractorRatingAdmin(admin.ModelAdmin):
    list_display = ('contractor', 'project', 'builder', 'rating', 'created_at')
    list_filter = ('rating',)
    search_fields = ('contractor__company_name', 'project__title', 'builder__email')
