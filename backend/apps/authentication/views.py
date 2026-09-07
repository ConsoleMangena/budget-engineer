from rest_framework import generics, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from .serializers import UserSerializer


class RegisterThrottle(AnonRateThrottle):
    """Tight rate limit for unauthenticated registration requests."""
    rate = '5/minute'

class UserDetailView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update the current authenticated user.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

class RegisterRequestView(generics.CreateAPIView):
    """
    Unauthenticated endpoint called immediately by the frontend 
    upon successful Supabase signup to pre-create the user, profile, 
    and PENDING AccountRequest in Django.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegisterThrottle]

    def post(self, request, *args, **kwargs):
        from django.contrib.auth.models import User
        from apps.authentication.models import Profile, AccountRequest

        email = request.data.get('email')
        supabase_id = request.data.get('supabase_id')
        role = request.data.get('role', 'BUILDER')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        phone_number = request.data.get('phone_number', '')

        if not email or not supabase_id:
            return Response({'error': 'email and supabase_id are required'}, status=400)

        # Get or create the Django User
        user, created = User.objects.get_or_create(
            username=supabase_id,
            defaults={
                'email': email,
                'first_name': first_name,
                'last_name': last_name
            }
        )

        # Get or create the Profile
        profile, p_created = Profile.objects.get_or_create(
            user=user,
            defaults={
                'role': role,
                'is_approved': False,
                'first_name': first_name,
                'last_name': last_name,
                'phone_number': phone_number,
                'supabase_id': supabase_id
            }
        )

        if not p_created:
            profile.role = role
            profile.first_name = first_name
            profile.last_name = last_name
            profile.phone_number = phone_number
            profile.supabase_id = supabase_id
            profile.is_approved = False
            profile.save()

        # Ensure a PENDING AccountRequest exists with the correct role
        account_req, ar_created = AccountRequest.objects.get_or_create(
            user=user,
            defaults={
                'requested_role': role,
                'status': 'PENDING'
            }
        )
        if not ar_created and account_req.status == 'PENDING':
            account_req.requested_role = role
            account_req.save()

        return Response({'success': True, 'message': 'Account request created successfully.'}, status=201)
