import os
import logging
from functools import lru_cache
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.db import DatabaseError
from supabase import create_client, Client
from django.contrib.auth.models import User
import time
import httpx
import jwt

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_supabase_client() -> Client:
    """Return a cached Supabase client singleton."""
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        raise AuthenticationFailed('Supabase credentials not configured.')
    return create_client(supabase_url, supabase_key)

_JWKS_CACHE: dict = {"fetched_at": 0.0, "jwks": None}


def _get_jwks_url() -> str:
    supabase_url = os.environ.get("SUPABASE_URL")
    if not supabase_url:
        raise AuthenticationFailed('Supabase credentials not configured.')
    return f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"


def _get_jwks(ttl_seconds: int = 3600) -> dict:
    now = time.time()
    if _JWKS_CACHE["jwks"] is not None and (now - float(_JWKS_CACHE["fetched_at"])) < ttl_seconds:
        return _JWKS_CACHE["jwks"]
    url = _get_jwks_url()
    try:
        r = httpx.get(url, timeout=10.0)
        r.raise_for_status()
        jwks = r.json()
        _JWKS_CACHE["jwks"] = jwks
        _JWKS_CACHE["fetched_at"] = now
        return jwks
    except Exception as e:
        raise AuthenticationFailed(f'Failed to fetch JWKS: {str(e)}')


def _verify_supabase_jwt(token: str) -> dict:
    """
    Verify Supabase JWT (ES256) using the project's JWKS.
    Returns decoded claims on success.
    """
    # Try PyJWT helper first
    try:
        jwks_client = jwt.PyJWKClient(_get_jwks_url())
        signing_key = jwks_client.get_signing_key_from_jwt(token).key
    except Exception:
        # Fallback to manual JWKS lookup
        header = jwt.get_unverified_header(token)
        kid = header.get('kid')
        jwk = next((k for k in (_get_jwks().get('keys') or []) if k.get('kid') == kid), None)
        if not jwk:
            raise AuthenticationFailed('JWT signing key not found (kid mismatch).')
        signing_key = jwt.algorithms.ECAlgorithm.from_jwk(jwk)

    supabase_url = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    expected_iss = f"{supabase_url}/auth/v1" if supabase_url else None

    return jwt.decode(
        token,
        signing_key,
        algorithms=["ES256"],
        issuer=expected_iss if expected_iss else None,
        options={"verify_aud": False},
    )


class SupabaseAuthentication(BaseAuthentication):
    """
    Validates Supabase JWT tokens and syncs user/profile/account-request
    data with Django on every authenticated request.
    """

    def authenticate_header(self, request):
        return 'Bearer'

    def _sync_django_user_from_claims(self, user_id: str, email: str, raw_meta: dict):
        django_user, created = User.objects.get_or_create(
            username=user_id,
            defaults={'email': email},
        )

        role = raw_meta.get('role', 'BUILDER')
        first_name = raw_meta.get('first_name', '')
        last_name = raw_meta.get('last_name', '')
        phone_number = raw_meta.get('phone_number', '')

        from .models import Profile, AccountRequest

        if created:
            django_user.email = email or ''
            django_user.first_name = first_name
            django_user.last_name = last_name
            django_user.save()

            profile, _ = Profile.objects.get_or_create(
                user=django_user,
                defaults={
                    'role': role,
                    'is_approved': False,
                    'first_name': first_name,
                    'last_name': last_name,
                    'phone_number': phone_number,
                },
            )
        else:
            profile, _ = Profile.objects.get_or_create(
                user=django_user,
                defaults={
                    'role': role,
                    'is_approved': False,
                },
            )

            user_changed = False
            profile_changed = False

            if first_name and django_user.first_name != first_name:
                django_user.first_name = first_name
                user_changed = True
            if last_name and django_user.last_name != last_name:
                django_user.last_name = last_name
                user_changed = True
            # Django remains source-of-truth for role changes.
            if phone_number and profile.phone_number != phone_number:
                profile.phone_number = phone_number
                profile_changed = True

            if user_changed:
                django_user.save()
            if profile_changed:
                profile.save()

        if not profile.is_approved:
            AccountRequest.objects.get_or_create(
                user=django_user,
                defaults={
                    'requested_role': profile.role,
                    'status': 'PENDING',
                },
            )

        return django_user

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None

        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            raise AuthenticationFailed('Invalid token header.')

        claims = None
        try:
            claims = _verify_supabase_jwt(token)
        except Exception as verify_error:
            logger.warning('Local JWT verification failed, trying Supabase API fallback: %s', verify_error)
            try:
                supabase: Client = _get_supabase_client()
                user_response = supabase.auth.get_user(jwt=token)
                sb_user = user_response.user
                if sb_user is None:
                    raise AuthenticationFailed('Supabase user not found.')

                claims = {
                    'sub': sb_user.id,
                    'email': sb_user.email,
                    'user_metadata': (
                        getattr(sb_user, 'user_metadata', None)
                        or getattr(sb_user, 'raw_user_meta_data', None)
                        or {}
                    ),
                }
            except Exception as fallback_error:
                raise AuthenticationFailed(f'Invalid token: {str(fallback_error)}')

        user_id = claims.get('sub') if isinstance(claims, dict) else None
        email = (claims.get('email') if isinstance(claims, dict) else '') or ''
        raw_meta = (claims.get('user_metadata') if isinstance(claims, dict) else {}) or {}

        if not user_id:
            raise AuthenticationFailed('Invalid token: missing sub.')

        try:
            django_user = self._sync_django_user_from_claims(user_id, email, raw_meta)
            return (django_user, None)
        except DatabaseError:
            logger.exception('Database error while syncing user from Supabase token. user_id=%s', user_id)
            raise
        except Exception:
            logger.exception('Unexpected sync error while authenticating user_id=%s', user_id)
            raise
