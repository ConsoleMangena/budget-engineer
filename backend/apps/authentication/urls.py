from django.urls import path
from .views import UserDetailView, RegisterRequestView

urlpatterns = [
    path('me/', UserDetailView.as_view(), name='user-detail'),
    path('register-request/', RegisterRequestView.as_view(), name='register-request'),
]
