from rest_framework import serializers
from django.contrib.auth.models import User
from django.conf import settings
from .models import Profile

class ProfileSerializer(serializers.ModelSerializer):
    has_signature = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ['role', 'phone_number', 'first_name', 'last_name', 'supabase_id', 'avatar', 'address', 'is_approved', 'signature', 'has_signature']
    
    def get_has_signature(self, obj):
        return bool(obj.signature)
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.avatar:
            request = self.context.get('request')
            if request:
                representation['avatar'] = request.build_absolute_uri(instance.avatar.url)
            else:
                representation['avatar'] = instance.avatar.url
        return representation

class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(required=False)
    avatar = serializers.ImageField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile', 'avatar']

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        avatar = validated_data.pop('avatar', None)

        # Update User fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Get or create profile
        profile, created = Profile.objects.get_or_create(user=instance)

        # Update Profile fields
        if profile_data:
            for attr, value in profile_data.items():
                setattr(profile, attr, value)

        if avatar:
            profile.avatar = avatar

        if profile_data or avatar:
            profile.save()

        return instance
