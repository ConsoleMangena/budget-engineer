from rest_framework import viewsets, permissions, exceptions
from .models import ContractorProfile, Bid, WIPAA, ProfessionalProfile
from .serializers import ContractorProfileSerializer, BidSerializer, WIPAASerializer, ProfessionalProfileSerializer
from apps.authentication.permissions import IsContractor, IsBuilder
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

class ContractorProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ContractorProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsContractor]

    def get_queryset(self):
        return ContractorProfile.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        if ContractorProfile.objects.filter(user=self.request.user).exists():
            raise exceptions.ValidationError("Profile already exists for this user.")
        serializer.save(user=self.request.user)

class BidViewSet(viewsets.ModelViewSet):
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticated, IsContractor]

    def get_queryset(self):
        return Bid.objects.filter(contractor__user=self.request.user)

    def perform_create(self, serializer):
        try:
            contractor = self.request.user.contractor_profile
        except ContractorProfile.DoesNotExist:
            raise exceptions.ValidationError("User does not have a contractor profile.")
        serializer.save(contractor=contractor)

class WIPAAViewSet(viewsets.ModelViewSet):
    serializer_class = WIPAASerializer
    permission_classes = [permissions.IsAuthenticated, IsContractor]

    def get_queryset(self):
        return WIPAA.objects.filter(contractor__user=self.request.user)

    def perform_create(self, serializer):
        try:
            contractor = self.request.user.contractor_profile
        except ContractorProfile.DoesNotExist:
            raise exceptions.ValidationError("User does not have a contractor profile.")
        serializer.save(contractor=contractor)
class ProfessionalProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for professional profiles. 
    Builders can view the directory, while Professionals can manage their own profiles.
    """
    queryset = ProfessionalProfile.objects.all().select_related('user')
    serializer_class = ProfessionalProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'availability', 'is_verified']
    search_fields = ['company_name', 'location', 'bio', 'specialties', 'user__first_name', 'user__last_name']
    ordering_fields = ['average_rating', 'experience_years', 'created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()] # Should ideally be restricted to the owner or admin
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        if ProfessionalProfile.objects.filter(user=self.request.user).exists():
            raise exceptions.ValidationError("Professional profile already exists for this user.")
        serializer.save(user=self.request.user)
