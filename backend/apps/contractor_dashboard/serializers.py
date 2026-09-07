from rest_framework import serializers
from django.contrib.auth.models import User
from .models import ContractorProfile, Bid, WIPAA, ProfessionalProfile

class ContractorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractorProfile
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')

class BidSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bid
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'total_amount')

class WIPAASerializer(serializers.ModelSerializer):
    over_under_billing = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = WIPAA
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
class UserProfessionalSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    phone_number = serializers.CharField(source='profile.phone_number', read_only=True)
    avatar = serializers.ImageField(source='profile.avatar', read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'full_name', 'phone_number', 'avatar')

class ProfessionalProfileSerializer(serializers.ModelSerializer):
    user_details = UserProfessionalSerializer(source='user', read_only=True)
    
    class Meta:
        model = ProfessionalProfile
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at', 'average_rating', 'completed_projects_count')
