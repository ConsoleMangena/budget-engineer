from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from django.db.utils import OperationalError, ProgrammingError
from apps.authentication.models import Profile, AccountRequest
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models import Sum, Count, Q, Avg
from django.db.models import Max
from django.db.models.functions import TruncDate
from apps.builder_dashboard.models import Project, MaterialRequest
from apps.contractor_dashboard.models import Bid, ProfessionalProfile
from apps.supplier_dashboard.models import MaterialOrder
from .models import (
    FloorPlanCategory, FloorPlanDataset, PlatformSettings,
    AdminActivityLog, log_admin_action,
    UserActivityEvent, log_user_activity,
)


class IsAdminRole(BasePermission):
    """Only allow users with ADMIN role on their profile."""
    def has_permission(self, request, view):
        profile = getattr(request.user, 'profile', None)
        return profile is not None and profile.role == 'ADMIN'


class AdminUserManagementView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, pk=None):
        if pk is not None:
            try:
                user = User.objects.select_related('profile').get(pk=pk)
            except User.DoesNotExist:
                return Response({'error': 'User not found'}, status=404)
            profile = getattr(user, 'profile', None)
            avatar_url = None
            if profile and getattr(profile, 'avatar', None):
                try:
                    if profile.avatar and hasattr(profile.avatar, 'url'):
                        avatar_url = request.build_absolute_uri(profile.avatar.url)
                except Exception:
                    avatar_url = None
            return Response({
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'date_joined': user.date_joined,
                'last_login': user.last_login,
                'is_active': user.is_active,
                'profile': {
                    'role': profile.role if profile else 'BUILDER',
                    'is_approved': profile.is_approved if profile else False,
                    'first_name': getattr(profile, 'first_name', '') if profile else '',
                    'last_name': getattr(profile, 'last_name', '') if profile else '',
                    'phone_number': getattr(profile, 'phone_number', '') if profile else '',
                    'address': getattr(profile, 'address', '') if profile else '',
                    'avatar_url': avatar_url,
                }
            })

        users_data = []
        for user in User.objects.all().select_related('profile'):
            profile = getattr(user, 'profile', None)
            users_data.append({
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'date_joined': user.date_joined,
                'role': profile.role if profile else 'BUILDER',
                'is_active': user.is_active,
                'is_approved': profile.is_approved if profile else False,
            })
        return Response(users_data)

    def post(self, request):
        """Allow admins to create users directly."""
        email = request.data.get('email')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        role = request.data.get('role', 'BUILDER')
        password = request.data.get('password') # Optional, if using Django auth directly

        if not email:
            return Response({'error': 'Email is required'}, status=400)

        if User.objects.filter(email=email).exists():
            return Response({'error': 'User with this email already exists'}, status=400)

        # Create Django User
        # Note: In this system, Supabase usually handles auth, but we create a matching Django user.
        # For admin-created users, we might need to handle Supabase invitation or just create the record.
        # For now, we create the Django user with a random username if no supabase_id is provided.
        import uuid
        username = str(uuid.uuid4())
        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name
        )
        if password:
            user.set_password(password)
            user.save()

        # Create Profile
        Profile.objects.create(
            user=user,
            role=role,
            is_approved=True,
            first_name=first_name,
            last_name=last_name
        )

        log_admin_action(request, 'USER_CREATED', 'User', user.id, email, f'Role: {role}')

        return Response({
            'success': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': role
            }
        }, status=201)

    def patch(self, request, pk=None):
        if not pk:
            return Response({'error': 'User ID required'}, status=400)
        try:
            user = User.objects.get(pk=pk)
            role = request.data.get('role')
            is_active = request.data.get('is_active')
            is_approved = request.data.get('is_approved')
            first_name = request.data.get('first_name')
            last_name = request.data.get('last_name')
            email = request.data.get('email')

            user_changed = False
            if first_name is not None:
                user.first_name = first_name
                user_changed = True
            if last_name is not None:
                user.last_name = last_name
                user_changed = True
            if email is not None and email != user.email:
                if User.objects.filter(email=email).exclude(pk=pk).exists():
                    return Response({'error': 'A user with this email already exists'}, status=400)
                user.email = email
                user_changed = True

            if role or is_approved is not None:
                profile, _ = Profile.objects.get_or_create(user=user)
                old_role = profile.role
                if role:
                    profile.role = role
                if is_approved is not None:
                    profile.is_approved = is_approved
                if first_name is not None:
                    profile.first_name = first_name
                if last_name is not None:
                    profile.last_name = last_name
                profile.save()
                if role and role != old_role:
                    log_admin_action(request, 'USER_ROLE_CHANGED', 'User', user.id, user.email, f'{old_role} → {role}')
            elif first_name is not None or last_name is not None:
                profile, _ = Profile.objects.get_or_create(user=user)
                if first_name is not None:
                    profile.first_name = first_name
                if last_name is not None:
                    profile.last_name = last_name
                profile.save()

            if is_active is not None:
                user.is_active = is_active
                user_changed = True
                log_admin_action(request, 'USER_TOGGLED', 'User', user.id, user.email, f"{'Activated' if is_active else 'Deactivated'}")

            if user_changed:
                user.save()

            return Response({'success': True})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

    def delete(self, request, pk=None):
        if not pk:
            return Response({'error': 'User ID required'}, status=400)
        if request.user.pk == pk:
            return Response(
                {'error': 'You cannot delete your own account'},
                status=400
            )
        try:
            user = User.objects.get(pk=pk)
            email = user.email
            user.delete()
            log_admin_action(request, 'USER_DELETED', 'User', pk, email)
            return Response({'success': True})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        except Exception as e:
            return Response(
                {'error': f'Failed to delete user: {str(e)}'},
                status=500
            )


class SystemMetricsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        from datetime import timedelta
        from django.db.models import Avg, Q
        from django.db.models.functions import TruncMonth

        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        total_users = User.objects.count()
        active_projects = Project.objects.filter(
            status__in=['ACTIVE', 'IN_PROGRESS']
        ).count()
        active_suppliers = Profile.objects.filter(role='SUPPLIER').count()

        # Calculate Volume from Accepted Bids, Delivered Orders, and Project Budgets
        bids_volume = Bid.objects.filter(status='ACCEPTED').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        orders_volume = MaterialOrder.objects.filter(
            status='DELIVERED'
        ).aggregate(total=Sum('total_cost'))['total'] or 0
        projects_volume = Project.objects.aggregate(
            total=Sum('budget')
        )['total'] or 0
        total_volume = float(bids_volume) + float(orders_volume) + float(projects_volume)

        # ── User distribution by role ──
        role_counts = (
            Profile.objects.values('role')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        user_distribution = [
            {'role': rc['role'], 'count': rc['count']}
            for rc in role_counts
        ]
        # Include users without profiles as BUILDER
        profiled_count = Profile.objects.count()
        if total_users > profiled_count:
            no_profile = total_users - profiled_count
            found_builder = False
            for ud in user_distribution:
                if ud['role'] == 'BUILDER':
                    ud['count'] += no_profile
                    found_builder = True
                    break
            if not found_builder:
                user_distribution.append({'role': 'BUILDER', 'count': no_profile})

        # ── Monthly platform activity (last 6 months) ──
        six_months_ago = now - timedelta(days=180)

        from apps.ai_architecture.models import ChatMessage

        # User signups per month
        signups_monthly = (
            User.objects.filter(date_joined__gte=six_months_ago)
            .annotate(month=TruncMonth('date_joined'))
            .values('month')
            .annotate(total=Count('id'))
            .order_by('month')
        )
        # Projects created per month
        projects_monthly = (
            Project.objects.filter(created_at__gte=six_months_ago)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(total=Count('id'))
            .order_by('month')
        )
        # AI messages per month
        messages_monthly = (
            ChatMessage.objects.filter(created_at__gte=six_months_ago)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(total=Count('id'))
            .order_by('month')
        )

        # Merge into a single timeline
        volume_map = {}
        for row in signups_monthly:
            key = row['month'].strftime('%Y-%m')
            volume_map.setdefault(key, {'month': key, 'signups': 0, 'projects': 0, 'ai_messages': 0})
            volume_map[key]['signups'] = row['total']
        for row in projects_monthly:
            key = row['month'].strftime('%Y-%m')
            volume_map.setdefault(key, {'month': key, 'signups': 0, 'projects': 0, 'ai_messages': 0})
            volume_map[key]['projects'] = row['total']
        for row in messages_monthly:
            key = row['month'].strftime('%Y-%m')
            volume_map.setdefault(key, {'month': key, 'signups': 0, 'projects': 0, 'ai_messages': 0})
            volume_map[key]['ai_messages'] = row['total']
        monthly_volume = sorted(volume_map.values(), key=lambda x: x['month'])

        # ── System overview metrics ──
        all_projects = Project.objects.all()
        total_projects = all_projects.count()
        avg_budget = all_projects.aggregate(avg=Avg('budget'))['avg'] or 0

        new_users_30d = User.objects.filter(date_joined__gte=thirty_days_ago).count()
        pending_requests = AccountRequest.objects.filter(status='PENDING').count()

        return Response({
            'total_users': total_users,
            'active_projects': active_projects,
            'active_suppliers': active_suppliers,
            'total_volume': total_volume,
            'user_distribution': user_distribution,
            'monthly_volume': monthly_volume,
            'system_overview': {
                'avg_project_budget': round(float(avg_budget), 2),
                'total_projects': total_projects,
                'new_users_30d': new_users_30d,
                'pending_requests': pending_requests,
            },
        })


class AccountRequestView(APIView):
    """
    GET  /api/v1/admin/requests/         - List all account requests (admin only)
    POST /api/v1/admin/requests/         - Submit a new account request (any authenticated user)
    PATCH /api/v1/admin/requests/<pk>/   - Approve or reject a request (admin only)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        requests = AccountRequest.objects.select_related('user', 'reviewed_by').all()
        data = []
        for req in requests:
            data.append({
                'id': req.id,
                'user_id': req.user.id,
                'email': req.user.email,
                'first_name': req.user.first_name,
                'last_name': req.user.last_name,
                'requested_role': req.requested_role,
                'status': req.status,
                'created_at': req.created_at,
                'reviewed_at': req.reviewed_at,
                'reviewed_by': req.reviewed_by.email if req.reviewed_by else None,
                'notes': req.notes,
            })
        return Response(data)

    def post(self, request):
        """Create an account request for the current user."""
        user = request.user
        requested_role = request.data.get('role', 'BUILDER')

        # Idempotent: only one request per user
        existing = AccountRequest.objects.filter(user=user).first()
        if existing:
            return Response({
                'id': existing.id,
                'status': existing.status,
                'message': 'Account request already exists.',
            }, status=200)

        account_request = AccountRequest.objects.create(
            user=user,
            requested_role=requested_role,
        )
        return Response({
            'id': account_request.id,
            'status': account_request.status,
            'message': 'Account request submitted successfully.',
        }, status=201)

    def patch(self, request, pk=None):
        """Approve or reject an account request (admin action)."""
        if not pk:
            return Response({'error': 'Request ID required'}, status=400)

        action = request.data.get('action')  # 'approve' or 'reject'
        notes = request.data.get('notes', '')

        if action not in ('approve', 'reject'):
            return Response({'error': "action must be 'approve' or 'reject'"}, status=400)

        try:
            account_request = AccountRequest.objects.select_related('user').get(pk=pk)
        except AccountRequest.DoesNotExist:
            return Response({'error': 'Request not found'}, status=404)

        account_request.reviewed_at = timezone.now()
        account_request.reviewed_by = request.user
        account_request.notes = notes

        if action == 'approve':
            account_request.status = 'APPROVED'
            account_request.save()
            # Grant access
            profile, _ = Profile.objects.get_or_create(user=account_request.user)
            profile.is_approved = True
            profile.role = account_request.requested_role
            profile.save()
            log_admin_action(request, 'REQUEST_APPROVED', 'AccountRequest', pk, account_request.user.email, f'Role: {account_request.requested_role}')
            return Response({'success': True, 'status': 'APPROVED'})
        else:
            account_request.status = 'REJECTED'
            account_request.save()
            # Ensure is_approved stays False
            profile, _ = Profile.objects.get_or_create(user=account_request.user)
            profile.is_approved = False
            profile.save()
            log_admin_action(request, 'REQUEST_REJECTED', 'AccountRequest', pk, account_request.user.email, notes)
            return Response({'success': True, 'status': 'REJECTED'})


class AIAnalyticsView(APIView):
    """
    GET /api/v1/admin/ai-analytics/
    Returns comprehensive AI usage metrics for the admin dashboard:
    - messages per day (last 30 days)
    - total tokens consumed + estimated cost
    - popular commands / endpoints
    - average feedback rating
    - BOQ template stats
    - model performance breakdown
    - analyse command stats
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        from datetime import timedelta
        from apps.ai_architecture.models import (
            ChatMessage, ChatSession, TokenUsage, ImageFeedback,
            BOQTemplate, MaterialPrice,
        )

        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        seven_days_ago = now - timedelta(days=7)

        # ── Messages per day (last 30 days) ──
        messages_per_day = (
            ChatMessage.objects
            .filter(created_at__gte=thirty_days_ago)
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )

        # ── Token usage summary ──
        token_summary = TokenUsage.objects.filter(
            created_at__gte=thirty_days_ago
        ).aggregate(
            total_input=Sum('input_tokens'),
            total_output=Sum('output_tokens'),
            total_tokens=Sum('total_tokens'),
            request_count=Count('id'),
        )

        # ── Estimated cost (Claude pricing: ~$3/M input, ~$15/M output) ──
        input_cost = ((token_summary['total_input'] or 0) / 1_000_000) * 3.0
        output_cost = ((token_summary['total_output'] or 0) / 1_000_000) * 15.0
        estimated_cost = round(input_cost + output_cost, 2)

        # ── 7-day vs 30-day comparison ──
        tokens_7d = TokenUsage.objects.filter(
            created_at__gte=seven_days_ago
        ).aggregate(total=Sum('total_tokens'), count=Count('id'))

        # ── Popular endpoints ──
        endpoint_breakdown = (
            TokenUsage.objects
            .filter(created_at__gte=thirty_days_ago)
            .values('endpoint')
            .annotate(count=Count('id'), tokens=Sum('total_tokens'))
            .order_by('-count')
        )

        # ── Top users by tokens ──
        top_users = (
            TokenUsage.objects
            .filter(created_at__gte=thirty_days_ago)
            .values('user__username', 'user__email')
            .annotate(total=Sum('total_tokens'), requests=Count('id'))
            .order_by('-total')[:10]
        )

        # ── Image feedback stats ──
        feedback_stats = {'avg_rating': 0, 'total_feedback': 0}
        if ImageFeedback.objects.exists():
            from django.db.models import Avg
            feedback_stats = ImageFeedback.objects.aggregate(
                avg_rating=Avg('rating'),
                total_feedback=Count('id'),
            )

        # ── Session count ──
        total_sessions = ChatSession.objects.count()
        active_sessions_30d = ChatSession.objects.filter(
            updated_at__gte=thirty_days_ago
        ).count()

        # ── BOQ Template stats ──
        boq_templates_count = BOQTemplate.objects.count()
        active_boq_template = BOQTemplate.objects.filter(is_active=True).first()
        boq_template_info = None
        if active_boq_template:
            boq_template_info = {
                'id': active_boq_template.id,
                'name': active_boq_template.name,
                'include_labour_rate': active_boq_template.include_labour_rate,
                'include_measurement_formula': active_boq_template.include_measurement_formula,
                'example_items_count': len(active_boq_template.get_example_items()),
                'updated_at': active_boq_template.updated_at.isoformat() if active_boq_template.updated_at else None,
            }

        # ── Training data summary ──
        training_data = {
            'material_prices': MaterialPrice.objects.count(),
            'material_regions': list(
                MaterialPrice.objects.values_list('region', flat=True).distinct()[:10]
            ),
        }

        # ── Analyse command usage (last 30 days) ──
        analyse_usage = TokenUsage.objects.filter(
            endpoint='analyse', created_at__gte=thirty_days_ago
        ).aggregate(
            count=Count('id'),
            tokens=Sum('total_tokens'),
        )

        # ── Model usage breakdown ──
        model_breakdown = (
            TokenUsage.objects
            .filter(created_at__gte=thirty_days_ago)
            .values('model_name')
            .annotate(count=Count('id'), tokens=Sum('total_tokens'))
            .order_by('-tokens')
        )

        # ── Messages by role (user vs assistant) ──
        messages_by_role = (
            ChatMessage.objects
            .filter(created_at__gte=thirty_days_ago)
            .values('role')
            .annotate(count=Count('id'))
        )

        return Response({
            'messages_per_day': list(messages_per_day),
            'token_summary': {
                'total_input': token_summary['total_input'] or 0,
                'total_output': token_summary['total_output'] or 0,
                'total_tokens': token_summary['total_tokens'] or 0,
                'request_count': token_summary['request_count'] or 0,
                'estimated_cost_usd': estimated_cost,
            },
            'tokens_7d': {
                'total': tokens_7d['total'] or 0,
                'count': tokens_7d['count'] or 0,
            },
            'endpoint_breakdown': list(endpoint_breakdown),
            'top_users': list(top_users),
            'feedback': {
                'avg_rating': round(float(feedback_stats.get('avg_rating') or 0), 2),
                'total_feedback': feedback_stats.get('total_feedback', 0),
            },
            'sessions': {
                'total': total_sessions,
                'active_30d': active_sessions_30d,
            },
            'boq_templates': {
                'total': boq_templates_count,
                'active_template': boq_template_info,
            },
            'training_data': training_data,
            'analyse_usage': {
                'count_30d': analyse_usage['count'] or 0,
                'tokens_30d': analyse_usage['tokens'] or 0,
            },
            'model_breakdown': list(model_breakdown),
            'messages_by_role': list(messages_by_role),
        })


# ═══════════════════════════════════════════════════════════════════════
# FLOOR PLAN VIEWS
# ═══════════════════════════════════════════════════════════════════════

class FloorPlanCategoryView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        cats = FloorPlanCategory.objects.all()
        data = [{'id': c.id, 'name': c.name, 'description': c.description or '', 'created_at': c.created_at} for c in cats]
        return Response({'results': data})

    def post(self, request):
        name = request.data.get('name', '').strip()
        desc = request.data.get('description', '')
        if not name:
            return Response({'error': 'Name required'}, status=400)
        cat = FloorPlanCategory.objects.create(name=name, description=desc)
        return Response({'id': cat.id, 'name': cat.name}, status=201)

    def delete(self, request, pk=None):
        if not pk:
            return Response({'error': 'ID required'}, status=400)
        try:
            FloorPlanCategory.objects.get(pk=pk).delete()
            return Response({'success': True})
        except FloorPlanCategory.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


class FloorPlanDatasetView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        plans = FloorPlanDataset.objects.select_related('category').all()
        data = []
        for p in plans:
            img_url = request.build_absolute_uri(p.image.url) if p.image else None
            data.append({
                'id': p.id, 'title': p.title, 'description': p.description or '',
                'image': img_url, 'category': p.category_id,
                'category_name': p.category.name if p.category else '',
                'created_at': p.created_at,
            })
        return Response({'results': data})

    def post(self, request):
        title = request.data.get('title', '').strip()
        category_id = request.data.get('category')
        image = request.FILES.get('image')
        description = request.data.get('description', '')
        if not title or not category_id or not image:
            return Response({'error': 'title, category, and image are required'}, status=400)
        try:
            cat = FloorPlanCategory.objects.get(pk=category_id)
        except FloorPlanCategory.DoesNotExist:
            return Response({'error': 'Category not found'}, status=404)
        plan = FloorPlanDataset.objects.create(
            title=title, description=description, image=image,
            category=cat, uploaded_by=request.user,
        )
        return Response({'id': plan.id, 'title': plan.title}, status=201)

    def delete(self, request, pk=None):
        if not pk:
            return Response({'error': 'ID required'}, status=400)
        try:
            FloorPlanDataset.objects.get(pk=pk).delete()
            return Response({'success': True})
        except FloorPlanDataset.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


# ═══════════════════════════════════════════════════════════════════════
# ADMIN PROJECTS OVERVIEW
# ═══════════════════════════════════════════════════════════════════════

class AdminProjectsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, pk=None):
        from datetime import timedelta
        from django.db.models.functions import TruncMonth
        from apps.builder_dashboard.models import Project as BuilderProject

        if pk is not None:
            try:
                p = BuilderProject.objects.select_related('owner', 'architect').get(pk=pk)
            except BuilderProject.DoesNotExist:
                return Response({'error': 'Not found'}, status=404)

            return Response({
                'id': p.id,
                'title': p.title,
                'location': p.location,
                'latitude': float(p.latitude) if p.latitude is not None else None,
                'longitude': float(p.longitude) if p.longitude is not None else None,
                'status': p.status,
                'budget': float(p.budget) if p.budget else 0,
                'engagement_tier': p.engagement_tier,
                'ai_brief': p.ai_brief,
                'owner': {
                    'id': p.owner.id,
                    'email': p.owner.email,
                    'name': f"{p.owner.first_name} {p.owner.last_name}".strip() or p.owner.username,
                },
                'architect': None if not p.architect else {
                    'id': p.architect.id,
                    'email': p.architect.email,
                    'name': f"{p.architect.first_name} {p.architect.last_name}".strip() or p.architect.username,
                },
                'program': {
                    'building_type': p.building_type,
                    'use_case': p.use_case,
                    'occupants': p.occupants,
                    'bedrooms': p.bedrooms,
                    'bathrooms': p.bathrooms,
                    'floors': p.floors,
                    'has_garage': p.has_garage,
                    'parking_spaces': p.parking_spaces,
                    'lot_size': p.lot_size,
                    'footprint': p.footprint,
                    'preferred_style': p.preferred_style,
                    'roof_type': p.roof_type,
                    'special_spaces': p.special_spaces,
                    'sustainability': p.sustainability,
                    'accessibility': p.accessibility,
                    'site_notes': p.site_notes,
                    'constraints': p.constraints,
                    'timeline': p.timeline,
                    'budget_flex': p.budget_flex,
                },
                'flags': {
                    'si56_verified': bool(p.si56_verified),
                    'is_budget_signed': bool(p.is_budget_signed),
                },
                'created_at': p.created_at,
                'updated_at': p.updated_at,
            })

        search = request.query_params.get('search', '').strip()
        status_filter = request.query_params.get('status', '').strip()

        qs = BuilderProject.objects.select_related('owner').all()
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(owner__email__icontains=search) | Q(location__icontains=search))
        if status_filter:
            qs = qs.filter(status=status_filter)

        projects = []
        for p in qs.order_by('-created_at')[:200]:
            projects.append({
                'id': p.id,
                'title': p.title,
                'location': p.location,
                'status': p.status,
                'budget': float(p.budget) if p.budget else 0,
                'owner_email': p.owner.email,
                'owner_name': f"{p.owner.first_name} {p.owner.last_name}".strip() or p.owner.username,
                'created_at': p.created_at,
            })

        # Summary stats
        total = BuilderProject.objects.count()
        by_status = dict(BuilderProject.objects.values_list('status').annotate(c=Count('id')).values_list('status', 'c'))
        total_budget = BuilderProject.objects.aggregate(s=Sum('budget'))['s'] or 0

        return Response({
            'projects': projects,
            'summary': {
                'total': total,
                'by_status': by_status,
                'total_budget': float(total_budget),
            },
        })


# ═══════════════════════════════════════════════════════════════════════
# ADMIN BILLING / SUBSCRIPTIONS
# ═══════════════════════════════════════════════════════════════════════

class AdminBillingView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        from apps.billing.models import SubscriptionPlan, Subscription, Invoice

        plans = list(SubscriptionPlan.objects.all().values('id', 'name', 'display_name', 'price', 'is_active', 'max_projects', 'storage_gb', 'support_level'))
        subscriptions = []
        for sub in Subscription.objects.select_related('user', 'plan').order_by('-created_at')[:200]:
            subscriptions.append({
                'id': sub.id,
                'user_email': sub.user.email,
                'user_name': f"{sub.user.first_name} {sub.user.last_name}".strip() or sub.user.username,
                'plan_name': sub.plan.name,
                'status': sub.status,
                'current_period_start': sub.current_period_start,
                'current_period_end': sub.current_period_end,
                'created_at': sub.created_at,
            })

        invoices = []
        for inv in Invoice.objects.select_related('user', 'subscription__plan').order_by('-created_at')[:100]:
            # Expiry: invoices expire after 10 days; on day 11+ mark as expired (if still unpaid/open).
            is_expired = False
            try:
                if inv.status in ('DRAFT', 'OPEN') and inv.invoice_date:
                    is_expired = timezone.now() > (inv.invoice_date + timezone.timedelta(days=10))
            except Exception:
                is_expired = False
            invoices.append({
                'id': inv.id,
                'invoice_number': inv.invoice_number,
                'user_email': inv.user.email,
                'customer_name': inv.customer_name or f"{inv.user.first_name} {inv.user.last_name}".strip(),
                'company_name': inv.company_name or '',
                'subtotal': float(inv.subtotal),
                'tax': float(inv.tax),
                'amount': float(inv.total),
                'status': inv.status,
                'is_expired': is_expired,
                'invoice_date': inv.invoice_date,
                'due_date': inv.due_date,
                'plan_name': inv.subscription.plan.name if inv.subscription else '—',
                'created_at': inv.created_at,
            })

        # Summary
        active_subs = Subscription.objects.filter(status='ACTIVE').count()
        total_revenue = Invoice.objects.filter(status='PAID').aggregate(s=Sum('total'))['s'] or 0

        return Response({
            'plans': plans,
            'subscriptions': subscriptions,
            'invoices': invoices,
            'summary': {
                'active_subscriptions': active_subs,
                'total_revenue': float(total_revenue),
                'total_plans': len(plans),
                'total_invoices': Invoice.objects.count(),
            },
        })

    def post(self, request):
        """
        Create an invoice (admin only).
        Payload:
          - user_email (required)
          - subtotal (required)
          - tax (optional)
          - status (optional: DRAFT/OPEN/PAID/VOID/UNCOLLECTIBLE)
          - due_date (optional ISO date/datetime; default: +14 days)
        """
        from decimal import Decimal
        from datetime import timedelta
        from django.utils.dateparse import parse_datetime, parse_date
        from apps.billing.models import Invoice, Subscription

        user_email = (request.data.get('user_email') or '').strip().lower()
        if not user_email:
            return Response({'error': 'user_email is required'}, status=400)

        try:
            target_user = User.objects.get(email__iexact=user_email)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        subtotal_raw = request.data.get('subtotal')
        if subtotal_raw is None or str(subtotal_raw).strip() == '':
            return Response({'error': 'subtotal is required'}, status=400)
        try:
            subtotal = Decimal(str(subtotal_raw))
        except Exception:
            return Response({'error': 'subtotal must be a number'}, status=400)

        tax_raw = request.data.get('tax', 0)
        try:
            tax = Decimal(str(tax_raw or 0))
        except Exception:
            return Response({'error': 'tax must be a number'}, status=400)

        status_val = (request.data.get('status') or 'DRAFT').strip().upper()
        allowed = {c[0] for c in Invoice.STATUS_CHOICES}
        if status_val not in allowed:
            return Response({'error': f'status must be one of {sorted(list(allowed))}'}, status=400)

        # Default expiry window: 10 days
        invoice_date = timezone.now()
        due_raw = request.data.get('due_date')
        due_dt = None
        if due_raw:
            due_dt = parse_datetime(due_raw)
            if due_dt is None:
                d = parse_date(due_raw)
                if d:
                    due_dt = timezone.make_aware(timezone.datetime(d.year, d.month, d.day, 23, 59, 59))
        if due_dt is None:
            due_dt = invoice_date + timedelta(days=10)
        if due_dt and timezone.is_naive(due_dt):
            due_dt = timezone.make_aware(due_dt)
        max_due = invoice_date + timedelta(days=10)
        if due_dt > max_due:
            return Response({'error': 'Due date cannot be after 10 days from invoice creation.'}, status=400)

        total = subtotal + tax

        # Attempt to attach subscription if present
        sub = Subscription.objects.filter(user=target_user).first()

        # Generate a simple unique invoice number
        invoice_number = f"INV-{timezone.now().strftime('%Y%m%d')}-{target_user.id}-{Invoice.objects.count() + 1}"
        # Ensure uniqueness in rare collisions
        suffix = 1
        base = invoice_number
        while Invoice.objects.filter(invoice_number=invoice_number).exists():
            suffix += 1
            invoice_number = f"{base}-{suffix}"

        customer_name = (request.data.get('customer_name') or '').strip()
        if not customer_name:
            customer_name = f"{target_user.first_name} {target_user.last_name}".strip() or target_user.email
        company_name = (request.data.get('company_name') or '').strip()

        inv = Invoice.objects.create(
            user=target_user,
            subscription=sub,
            invoice_number=invoice_number,
            status=status_val,
            subtotal=subtotal,
            tax=tax,
            total=total,
            amount_paid=total if status_val == 'PAID' else Decimal('0'),
            invoice_date=invoice_date,
            due_date=due_dt,
            paid_at=timezone.now() if status_val == 'PAID' else None,
            customer_name=customer_name,
            company_name=company_name,
        )

        log_admin_action(request, 'OTHER', 'Invoice', inv.id, inv.invoice_number, f'Created invoice for {target_user.email} ({status_val})')

        return Response({
            'success': True,
            'invoice': {
                'id': inv.id,
                'invoice_number': inv.invoice_number,
                'user_email': inv.user.email,
                'customer_name': inv.customer_name,
                'company_name': inv.company_name,
                'amount': float(inv.total),
                'status': inv.status,
                'created_at': inv.created_at,
                'due_date': inv.due_date,
            }
        }, status=201)


# ═══════════════════════════════════════════════════════════════════════
# PLATFORM SETTINGS
# ═══════════════════════════════════════════════════════════════════════

class PlatformSettingsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        s = PlatformSettings.load()
        return Response({
            'site_name': s.site_name,
            'tagline': s.tagline,
            'support_email': s.support_email,
            'registration_open': s.registration_open,
            'require_approval': s.require_approval,
            'maintenance_mode': s.maintenance_mode,
            'maintenance_message': s.maintenance_message,
            'default_role': s.default_role,
            'max_projects_per_user': s.max_projects_per_user,
            'max_file_upload_mb': s.max_file_upload_mb,
        })

    def patch(self, request):
        s = PlatformSettings.load()
        changed = []
        for field in [
            'site_name', 'tagline', 'support_email', 'registration_open',
            'require_approval', 'maintenance_mode', 'maintenance_message',
            'default_role', 'max_projects_per_user', 'max_file_upload_mb',
        ]:
            if field in request.data:
                old = getattr(s, field)
                new = request.data[field]
                if str(old) != str(new):
                    changed.append(f"{field}: {old} → {new}")
                setattr(s, field, new)
        s.save()
        if changed:
            log_admin_action(request, 'SETTINGS_CHANGED', 'PlatformSettings', 1, 'Platform Settings', '; '.join(changed))
        return Response({'success': True})


# ═══════════════════════════════════════════════════════════════════════
# ACTIVITY LOG
# ═══════════════════════════════════════════════════════════════════════

class AdminActivityLogView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        limit = min(int(request.query_params.get('limit', 100)), 500)
        action_filter = request.query_params.get('action', '').strip()

        qs = AdminActivityLog.objects.select_related('actor').all()
        if action_filter:
            qs = qs.filter(action=action_filter)

        logs = []
        for entry in qs[:limit]:
            logs.append({
                'id': entry.id,
                'actor_email': entry.actor.email if entry.actor else '—',
                'actor_name': f"{entry.actor.first_name} {entry.actor.last_name}".strip() if entry.actor else '—',
                'action': entry.action,
                'action_display': entry.get_action_display(),
                'target_type': entry.target_type,
                'target_id': entry.target_id,
                'target_label': entry.target_label,
                'detail': entry.detail,
                'created_at': entry.created_at,
            })
        return Response(logs)


class UserActivityEventView(APIView):
    """
    POST /api/v1/admin/activity/
    Records a lightweight user activity event (primarily page views).
    Accessible to any authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        event_type = (request.data.get('event_type') or 'PAGE_VIEW').strip()
        path = (request.data.get('path') or '').strip()
        title = (request.data.get('title') or '').strip()
        referrer = (request.data.get('referrer') or '').strip()
        metadata = request.data.get('metadata')
        try:
            log_user_activity(
                request,
                user=request.user,
                event_type=event_type,
                path=path,
                title=title,
                referrer=referrer,
                metadata=metadata,
            )
            return Response({'success': True}, status=status.HTTP_201_CREATED)
        except (OperationalError, ProgrammingError):
            # Most common cause: migrations not applied yet (missing table).
            return Response(
                {
                    'success': False,
                    'error': 'Activity tracking is not ready on the server (missing migrations). Run backend migrations and retry.',
                },
                status=status.HTTP_200_OK,
            )
        except Exception:
            # Never let activity logging break the app UX.
            return Response({'success': False}, status=status.HTTP_200_OK)


class AdminUserActivityView(APIView):
    """
    GET /api/v1/admin/users/<pk>/activity/
    Admin-only: activity timeline for a specific user.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, pk=None):
        if not pk:
            return Response({'error': 'User ID required'}, status=400)

        limit = min(int(request.query_params.get('limit', 200)), 1000)
        event_type = (request.query_params.get('event_type') or '').strip()

        qs = UserActivityEvent.objects.select_related('user').filter(user_id=pk)
        if event_type:
            qs = qs.filter(event_type=event_type)

        events = []
        for e in qs[:limit]:
            events.append({
                'id': e.id,
                'event_type': e.event_type,
                'event_type_display': e.get_event_type_display(),
                'path': e.path,
                'title': e.title,
                'referrer': e.referrer,
                'metadata': e.metadata,
                'ip_address': e.ip_address,
                'created_at': e.created_at,
            })
        return Response(events)


class AdminUserAuditLogView(APIView):
    """
    GET /api/v1/admin/audit-log/
    Admin-only: one row per user showing aggregated activity.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        limit = min(int(request.query_params.get('limit', 200)), 1000)
        search = (request.query_params.get('search') or '').strip()
        role = (request.query_params.get('role') or '').strip()
        include_empty = (request.query_params.get('include_empty') or '').strip().lower() in ('1', 'true', 'yes')

        users_qs = User.objects.all().select_related('profile')
        if search:
            users_qs = users_qs.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(username__icontains=search)
            )
        if role:
            users_qs = users_qs.filter(profile__role=role)

        # Aggregate activity per user
        agg_qs = (
            UserActivityEvent.objects
            .values('user_id')
            .annotate(
                total_events=Count('id'),
                page_views=Count('id', filter=Q(event_type='PAGE_VIEW')),
                last_seen=Max('created_at'),
            )
        )
        agg_map = {row['user_id']: row for row in agg_qs}

        rows = []
        total_events_sum = 0
        total_page_views_sum = 0
        active_users = 0

        for u in users_qs[:limit]:
            a = agg_map.get(u.id)
            if not a and not include_empty:
                continue
            profile = getattr(u, 'profile', None)
            total_events = int(a['total_events']) if a else 0
            page_views = int(a['page_views']) if a else 0
            last_seen = a['last_seen'] if a else None

            if total_events > 0:
                active_users += 1
                total_events_sum += total_events
                total_page_views_sum += page_views

            rows.append({
                'user_id': u.id,
                'email': u.email,
                'name': f"{u.first_name} {u.last_name}".strip() or u.username or u.email,
                'role': profile.role if profile else 'BUILDER',
                'is_active': u.is_active,
                'total_events': total_events,
                'page_views': page_views,
                'last_seen': last_seen,
                'joined': u.date_joined,
            })

        rows.sort(key=lambda r: r['last_seen'] or timezone.datetime.min.replace(tzinfo=timezone.get_current_timezone()), reverse=True)

        return Response({
            'summary': {
                'users_with_activity': active_users,
                'total_events': total_events_sum,
                'total_page_views': total_page_views_sum,
            },
            'results': rows,
        })


# ═══════════════════════════════════════════════════════════════════════
# FINANCE (COA + JOURNAL + REPORTS)
# ═══════════════════════════════════════════════════════════════════════

class AdminChartOfAccountsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        from apps.billing.models import ChartOfAccount
        q = (request.query_params.get('q') or '').strip().lower()
        account_type = (request.query_params.get('type') or '').strip().upper()

        qs = ChartOfAccount.objects.all()
        if q:
            qs = qs.filter(Q(code__icontains=q) | Q(name__icontains=q))
        if account_type:
            qs = qs.filter(account_type=account_type)

        return Response([
            {
                'id': a.id,
                'code': a.code,
                'name': a.name,
                'account_type': a.account_type,
                'description': a.description or '',
                'is_active': a.is_active,
                'created_at': a.created_at,
            }
            for a in qs.order_by('code')[:1000]
        ])

    def post(self, request):
        from apps.billing.models import ChartOfAccount
        code = (request.data.get('code') or '').strip()
        name = (request.data.get('name') or '').strip()
        account_type = (request.data.get('account_type') or '').strip().upper()
        description = (request.data.get('description') or '').strip()

        if not code or not name or not account_type:
            return Response({'error': 'code, name, and account_type are required'}, status=400)

        allowed = {c[0] for c in ChartOfAccount.ACCOUNT_TYPES}
        if account_type not in allowed:
            return Response({'error': f'account_type must be one of {sorted(list(allowed))}'}, status=400)

        if ChartOfAccount.objects.filter(code=code).exists():
            return Response({'error': 'Account code already exists'}, status=400)

        a = ChartOfAccount.objects.create(
            code=code,
            name=name,
            account_type=account_type,
            description=description,
            is_active=True,
        )
        log_admin_action(request, 'OTHER', 'ChartOfAccount', a.id, f'{a.code} {a.name}', 'Created account')
        return Response({'success': True, 'account': {'id': a.id}}, status=201)


class AdminAccountLedgerView(APIView):
    """
    GET /api/v1/admin/finance/accounts/<pk>/ledger/
    Admin-only: show how money moves through an account.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, pk=None):
        from decimal import Decimal
        from django.db.models import Sum as DSum
        from apps.billing.models import ChartOfAccount, JournalLine

        if not pk:
            return Response({'error': 'Account ID required'}, status=400)

        try:
            account = ChartOfAccount.objects.get(pk=pk)
        except ChartOfAccount.DoesNotExist:
            return Response({'error': 'Account not found'}, status=404)

        limit = min(int(request.query_params.get('limit', 200)), 1000)
        include_drafts = (request.query_params.get('include_drafts') or '').strip().lower() in ('1', 'true', 'yes')
        qs = JournalLine.objects.select_related('entry', 'account').filter(account=account)
        if not include_drafts:
            qs = qs.filter(entry__status='POSTED')

        # Totals for this account
        totals = qs.aggregate(debit=DSum('debit'), credit=DSum('credit'))
        debit = Decimal(str(totals.get('debit') or 0))
        credit = Decimal(str(totals.get('credit') or 0))

        if account.account_type in ('ASSET', 'EXPENSE'):
            balance = debit - credit
        else:
            balance = credit - debit

        rows = []
        for l in qs.order_by('-entry__entry_date', '-id')[:limit]:
            rows.append({
                'id': l.id,
                'entry_id': l.entry_id,
                'entry_date': l.entry.entry_date,
                'entry_status': l.entry.status,
                'reference': l.entry.reference,
                'memo': l.entry.memo,
                'description': l.description,
                'debit': float(l.debit),
                'credit': float(l.credit),
            })

        return Response({
            'account': {
                'id': account.id,
                'code': account.code,
                'name': account.name,
                'account_type': account.account_type,
            },
            'totals': {
                'debit': float(debit),
                'credit': float(credit),
                'balance': float(balance),
            },
            'lines': rows,
        })


class AdminJournalEntriesView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        from apps.billing.models import JournalEntry
        status_filter = (request.query_params.get('status') or '').strip().upper()
        limit = min(int(request.query_params.get('limit', 200)), 1000)

        qs = JournalEntry.objects.prefetch_related('lines', 'lines__account').all()
        if status_filter:
            qs = qs.filter(status=status_filter)

        data = []
        for je in qs.order_by('-entry_date')[:limit]:
            debit = sum([float(l.debit) for l in je.lines.all()])
            credit = sum([float(l.credit) for l in je.lines.all()])
            data.append({
                'id': je.id,
                'reference': je.reference,
                'memo': je.memo,
                'entry_date': je.entry_date,
                'status': je.status,
                'debit_total': debit,
                'credit_total': credit,
                'lines': [
                    {
                        'id': l.id,
                        'account_id': l.account_id,
                        'account_code': l.account.code,
                        'account_name': l.account.name,
                        'description': l.description,
                        'debit': float(l.debit),
                        'credit': float(l.credit),
                    } for l in je.lines.all()
                ],
            })
        return Response(data)

    def post(self, request):
        """
        Create a journal entry.
        Payload:
          - entry_date (optional, ISO)
          - memo (optional)
          - reference (optional)
          - lines: [{account_id, debit, credit, description?}] (required)
        """
        from decimal import Decimal
        from django.utils.dateparse import parse_datetime, parse_date
        from apps.billing.models import JournalEntry, JournalLine, ChartOfAccount

        lines = request.data.get('lines') or []
        if not isinstance(lines, list) or len(lines) == 0:
            return Response({'error': 'lines[] required'}, status=400)

        entry_date_raw = request.data.get('entry_date')
        entry_date = timezone.now()
        if entry_date_raw:
            dt = parse_datetime(entry_date_raw)
            if dt is None:
                d = parse_date(entry_date_raw)
                if d:
                    dt = timezone.make_aware(timezone.datetime(d.year, d.month, d.day, 0, 0, 0))
            if dt:
                entry_date = dt

        je = JournalEntry.objects.create(
            entry_date=entry_date,
            memo=(request.data.get('memo') or '').strip(),
            reference=(request.data.get('reference') or '').strip(),
            status='DRAFT',
            created_by=request.user,
        )

        debit_sum = Decimal('0')
        credit_sum = Decimal('0')
        for ln in lines:
            try:
                account_id = int(ln.get('account_id'))
            except Exception:
                je.delete()
                return Response({'error': 'Invalid account_id in lines'}, status=400)

            account = ChartOfAccount.objects.filter(id=account_id).first()
            if not account:
                je.delete()
                return Response({'error': f'Account not found: {account_id}'}, status=404)

            try:
                debit = Decimal(str(ln.get('debit') or 0))
                credit = Decimal(str(ln.get('credit') or 0))
            except Exception:
                je.delete()
                return Response({'error': 'Invalid debit/credit in lines'}, status=400)

            if debit < 0 or credit < 0:
                je.delete()
                return Response({'error': 'debit/credit must be >= 0'}, status=400)
            if debit == 0 and credit == 0:
                continue

            JournalLine.objects.create(
                entry=je,
                account=account,
                description=(ln.get('description') or '').strip(),
                debit=debit,
                credit=credit,
            )
            debit_sum += debit
            credit_sum += credit

        if debit_sum == 0 and credit_sum == 0:
            je.delete()
            return Response({'error': 'At least one non-zero line is required'}, status=400)

        if debit_sum != credit_sum:
            je.delete()
            return Response({'error': 'Journal entry is not balanced (debits must equal credits)'}, status=400)

        log_admin_action(request, 'OTHER', 'JournalEntry', je.id, f'JE#{je.id}', f'Created draft ({float(debit_sum)})')
        return Response({'success': True, 'id': je.id}, status=201)


class AdminJournalEntryPostView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, pk=None):
        from decimal import Decimal
        from apps.billing.models import JournalEntry

        if not pk:
            return Response({'error': 'ID required'}, status=400)
        try:
            je = JournalEntry.objects.prefetch_related('lines').get(pk=pk)
        except JournalEntry.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        if je.status != 'DRAFT':
            return Response({'error': 'Only draft entries can be posted'}, status=400)

        debit = sum([Decimal(str(l.debit)) for l in je.lines.all()])
        credit = sum([Decimal(str(l.credit)) for l in je.lines.all()])
        if debit != credit:
            return Response({'error': 'Entry is not balanced'}, status=400)

        je.status = 'POSTED'
        je.save()
        log_admin_action(request, 'OTHER', 'JournalEntry', je.id, f'JE#{je.id}', 'Posted')
        return Response({'success': True})


class AdminFinanceReportsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        """
        GET /api/v1/admin/finance/reports/
        Returns Balance Sheet + P&L derived from POSTED journal lines.
        """
        from decimal import Decimal
        from apps.billing.models import ChartOfAccount, JournalLine
        from django.db.models import Sum as DSum

        posted_lines = JournalLine.objects.filter(entry__status='POSTED').select_related('account')

        # Compute balances: normal balance depends on account_type.
        balances = {}
        for row in posted_lines.values('account_id', 'account__code', 'account__name', 'account__account_type').annotate(
            debit=DSum('debit'),
            credit=DSum('credit'),
        ):
            debit = Decimal(str(row['debit'] or 0))
            credit = Decimal(str(row['credit'] or 0))
            acct_type = row['account__account_type']
            # Assets/Expenses: debit-balance. Liabilities/Equity/Revenue: credit-balance.
            if acct_type in ('ASSET', 'EXPENSE'):
                bal = debit - credit
            else:
                bal = credit - debit
            balances[row['account_id']] = {
                'id': row['account_id'],
                'code': row['account__code'],
                'name': row['account__name'],
                'account_type': acct_type,
                'balance': float(bal),
            }

        def group(t):
            return [b for b in balances.values() if b['account_type'] == t and abs(b['balance']) > 0.0001]

        assets = group('ASSET')
        liabilities = group('LIABILITY')
        equity = group('EQUITY')
        revenue = group('REVENUE')
        expenses = group('EXPENSE')

        sum_assets = float(sum([a['balance'] for a in assets]))
        sum_liabilities = float(sum([a['balance'] for a in liabilities]))
        sum_equity = float(sum([a['balance'] for a in equity]))

        sum_revenue = float(sum([a['balance'] for a in revenue]))
        sum_expenses = float(sum([a['balance'] for a in expenses]))
        net_income = sum_revenue - sum_expenses

        return Response({
            'balance_sheet': {
                'assets': assets,
                'liabilities': liabilities,
                'equity': equity,
                'totals': {
                    'assets': sum_assets,
                    'liabilities': sum_liabilities,
                    'equity': sum_equity,
                    'liabilities_plus_equity': sum_liabilities + sum_equity + net_income,
                }
            },
            'profit_and_loss': {
                'revenue': revenue,
                'expenses': expenses,
                'totals': {
                    'revenue': sum_revenue,
                    'expenses': sum_expenses,
                    'net_income': net_income,
                }
            }
        })


# ═══════════════════════════════════════════════════════════════════════
# ADMIN PROCUREMENT MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════

class AdminProcurementView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        status_filter = request.query_params.get('status')
        category_filter = request.query_params.get('category')
        project_id = request.query_params.get('project')

        qs = MaterialRequest.objects.select_related('project', 'project__owner').all()

        if status_filter:
            qs = qs.filter(status=status_filter)
        if category_filter:
            qs = qs.filter(procurement_category=category_filter)
        if project_id:
            qs = qs.filter(project_id=project_id)

        data = []
        for req in qs.order_by('-created_at')[:500]:
            data.append({
                'id': req.id,
                'project_id': req.project.id,
                'project_title': req.project.title,
                'owner_email': req.project.owner.email,
                'material_name': req.material_name,
                'quantity_requested': float(req.quantity_requested),
                'unit': req.unit,
                'procurement_category': req.procurement_category,
                'procurement_method': req.procurement_method,
                'price_at_request': float(req.price_at_request),
                'total_calculated_cost': float(req.total_calculated_cost),
                'status': req.status,
                'created_at': req.created_at,
            })

        # Summary for Admin
        summary = {
            'total_requests': qs.count(),
            'pending_requests': qs.filter(status='PENDING').count(),
            'total_cost': float(qs.aggregate(s=Sum('total_calculated_cost'))['s'] or 0),
            'by_status': dict(qs.values_list('status').annotate(c=Count('id')).values_list('status', 'c')),
        }

        return Response({
            'requests': data,
            'summary': summary
        })


class AdminProfessionalManagementView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        profs = ProfessionalProfile.objects.select_related('user').all()
        data = []
        for p in profs:
            data.append({
                'id': p.id,
                'user_id': p.user.id,
                'email': p.user.email,
                'full_name': f"{p.user.first_name} {p.user.last_name}".strip() or p.user.username,
                'role': p.role,
                'company_name': p.company_name,
                'location': p.location,
                'is_verified': p.is_verified,
                'availability': p.availability,
                'average_rating': float(p.average_rating),
                'created_at': p.created_at,
            })
        return Response(data)

    def post(self, request):
        user_id = request.data.get('user_id')
        email = request.data.get('email')
        role = request.data.get('role', 'architect')
        company_name = request.data.get('company_name', '')
        location = request.data.get('location', '')
        is_verified = request.data.get('is_verified', False)

        if user_id:
            try:
                user = User.objects.get(pk=user_id)
            except User.DoesNotExist:
                return Response({'error': 'User not found'}, status=404)
        elif email:
            # Create a new user if not exists
            user = User.objects.filter(email=email).first()
            if not user:
                import uuid
                username = str(uuid.uuid4())
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=request.data.get('first_name', ''),
                    last_name=request.data.get('last_name', '')
                )
                Profile.objects.create(
                    user=user,
                    role='CONTRACTOR', # Default role for staff
                    is_approved=True
                )
        else:
            return Response({'error': 'user_id or email required'}, status=400)

        # Check if profile already exists
        if ProfessionalProfile.objects.filter(user=user).exists():
            return Response({'error': 'Professional profile already exists for this user'}, status=400)

        prof = ProfessionalProfile.objects.create(
            user=user,
            role=role,
            company_name=company_name,
            location=location,
            is_verified=is_verified
        )

        log_admin_action(request, 'PROFESSIONAL_CREATED', 'ProfessionalProfile', prof.id, user.email, f'Role: {role}')

        return Response({'id': prof.id, 'success': True}, status=201)

    def patch(self, request, pk=None):
        if not pk:
            return Response({'error': 'ID required'}, status=400)
        try:
            prof = ProfessionalProfile.objects.get(pk=pk)
            for field in ['role', 'company_name', 'location', 'is_verified', 'availability']:
                if field in request.data:
                    setattr(prof, field, request.data[field])
            prof.save()
            log_admin_action(request, 'PROFESSIONAL_UPDATED', 'ProfessionalProfile', pk, prof.user.email)
            return Response({'success': True})
        except ProfessionalProfile.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

    def delete(self, request, pk=None):
        if not pk:
            return Response({'error': 'ID required'}, status=400)
        try:
            prof = ProfessionalProfile.objects.get(pk=pk)
            email = prof.user.email
            prof.delete()
            log_admin_action(request, 'PROFESSIONAL_DELETED', 'ProfessionalProfile', pk, email)
            return Response({'success': True})
        except ProfessionalProfile.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
