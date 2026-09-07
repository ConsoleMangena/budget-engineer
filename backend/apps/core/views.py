from rest_framework import views, permissions
from rest_framework.response import Response
from .models import LegalDocument, HelpCenterCategory, HelpCenterArticle, FAQ
from .serializers import LegalDocumentSerializer, HelpCenterCategorySerializer, HelpCenterArticleSerializer, FAQSerializer

class LegalDocumentView(views.APIView):
    """
    Get Terms of Service or Privacy Policy by document type
    """
    permission_classes = [permissions.AllowAny]  # Public access
    
    def get(self, request, document_type):
        # Map lowercase to uppercase document types
        document_type_map = {
            'terms': 'TERMS',
            'privacy': 'PRIVACY',
        }
        
        mapped_type = document_type_map.get(document_type.lower())
        if not mapped_type:
            return Response(
                {'error': f'Invalid document type: {document_type}'},
                status=400
            )
        
        try:
            document = LegalDocument.objects.get(
                document_type=mapped_type,
                is_active=True
            )
            serializer = LegalDocumentSerializer(document)
            return Response(serializer.data)
        except LegalDocument.DoesNotExist:
            return Response(
                {'error': f'{document_type} document not found'},
                status=404
            )


class HelpCenterCategoryListView(views.APIView):
    """
    Get all active help center categories with their articles
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        categories = HelpCenterCategory.objects.filter(is_active=True).prefetch_related(
            'articles'
        ).order_by('order', 'name')
        
        # Filter articles to only active ones
        for category in categories:
            category.active_articles = category.articles.filter(is_active=True).order_by('order', 'title')

        serializer = HelpCenterCategorySerializer(categories, many=True)
        return Response({'categories': serializer.data})


class HelpCenterArticleListView(views.APIView):
    """
    Get all help center articles, optionally filtered by category
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        category_slug = request.query_params.get('category', None)
        featured_only = request.query_params.get('featured', 'false').lower() == 'true'
        
        articles = HelpCenterArticle.objects.filter(is_active=True).select_related('category')
        
        if category_slug:
            articles = articles.filter(category__slug=category_slug)
        
        if featured_only:
            articles = articles.filter(is_featured=True)
        
        articles = articles.order_by('category__order', 'category__name', 'order', 'title')
        
        serializer = HelpCenterArticleSerializer(articles, many=True)
        return Response({'articles': serializer.data})


class HelpCenterArticleDetailView(views.APIView):
    """
    Get a specific help center article by slug
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, slug):
        try:
            article = HelpCenterArticle.objects.get(slug=slug, is_active=True)
            # Increment view count
            article.views_count += 1
            article.save(update_fields=['views_count'])
            
            serializer = HelpCenterArticleSerializer(article)
            return Response(serializer.data)
        except HelpCenterArticle.DoesNotExist:
            return Response(
                {'error': 'Article not found'},
                status=404
            )


class FAQListView(views.APIView):
    """
    Get all FAQs, optionally filtered by category
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        category_slug = request.query_params.get('category', None)
        
        faqs = FAQ.objects.filter(is_active=True).select_related('category')
        
        if category_slug:
            faqs = faqs.filter(category__slug=category_slug)
        
        faqs = faqs.order_by('category__order', 'category__name', 'order', 'question')
        
        serializer = FAQSerializer(faqs, many=True)
        return Response({'faqs': serializer.data})


class FAQDetailView(views.APIView):
    """
    Get a specific FAQ by ID
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, faq_id):
        try:
            faq = FAQ.objects.get(id=faq_id, is_active=True)
            # Increment view count
            faq.views_count += 1
            faq.save(update_fields=['views_count'])
            
            serializer = FAQSerializer(faq)
            return Response(serializer.data)
        except FAQ.DoesNotExist:
            return Response(
                {'error': 'FAQ not found'},
                status=404
            )

