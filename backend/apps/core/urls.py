from django.urls import path
from .views import (
    LegalDocumentView,
    HelpCenterCategoryListView,
    HelpCenterArticleListView,
    HelpCenterArticleDetailView,
    FAQListView,
    FAQDetailView,
)

urlpatterns = [
    path('legal-documents/<str:document_type>/', LegalDocumentView.as_view(), name='legal-document'),
    path('help-center/categories/', HelpCenterCategoryListView.as_view(), name='help-center-categories'),
    path('help-center/articles/', HelpCenterArticleListView.as_view(), name='help-center-articles'),
    path('help-center/articles/<str:slug>/', HelpCenterArticleDetailView.as_view(), name='help-center-article-detail'),
    path('help-center/faqs/', FAQListView.as_view(), name='help-center-faqs'),
    path('help-center/faqs/<int:faq_id>/', FAQDetailView.as_view(), name='help-center-faq-detail'),
]

