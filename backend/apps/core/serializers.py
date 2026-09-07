from rest_framework import serializers
from .models import LegalDocument, HelpCenterCategory, HelpCenterArticle, FAQ

class LegalDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LegalDocument
        fields = ['id', 'document_type', 'title', 'content', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class HelpCenterArticleSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = HelpCenterArticle
        fields = ['id', 'category', 'category_name', 'title', 'slug', 'content', 'excerpt', 'order', 
                  'is_featured', 'is_active', 'views_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'views_count']


class FAQSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    
    class Meta:
        model = FAQ
        fields = ['id', 'question', 'answer', 'category', 'category_name', 'category_slug', 
                  'order', 'is_active', 'views_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'views_count']


class HelpCenterCategorySerializer(serializers.ModelSerializer):
    articles = serializers.SerializerMethodField()
    articles_count = serializers.SerializerMethodField()

    class Meta:
        model = HelpCenterCategory
        fields = ['id', 'name', 'slug', 'description', 'icon', 'order', 'is_active',
                  'articles', 'articles_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_articles(self, obj):
        qs = getattr(obj, 'active_articles', obj.articles.all())
        return HelpCenterArticleSerializer(qs, many=True).data

    def get_articles_count(self, obj):
        qs = getattr(obj, 'active_articles', obj.articles.all())
        return qs.count()

