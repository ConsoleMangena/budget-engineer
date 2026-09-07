from rest_framework import serializers
from .models import ArchitecturalStudioItem

class ArchitecturalStudioItemSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = ArchitecturalStudioItem
        fields = [
            'id', 'project', 'title', 'description', 'file', 
            'category', 'category_display', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
