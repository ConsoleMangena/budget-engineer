import os
import dj_database_url
from dotenv import load_dotenv
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables reliably regardless of cwd.
# Prefer repo-root `.env`, then fall back to `backend/.env` if present.
load_dotenv(BASE_DIR.parent / '.env')
load_dotenv(BASE_DIR / '.env')


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ['SECRET_KEY']  # No fallback — must be set in .env

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'False') == 'True'  # Defaults to False (production-safe)

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'django_filters',
    'apps.core',
    'apps.authentication',
    'apps.admin_dashboard',
    'apps.ai_architecture',
    'apps.architectural_studio',
    'apps.billing',
    'apps.builder_dashboard',
    'apps.contractor_dashboard',
    'apps.supplier_dashboard',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASE_URL = os.getenv('DATABASE_URL')

if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            ssl_require=DATABASE_URL.startswith('postgres')
        )
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Supabase Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# ── AI Provider Configuration ────────────────────────────────────────
# Provider-agnostic primary config (Google Gemini default)
AI_API_PROVIDER = os.getenv('AI_API_PROVIDER', 'google')
AI_API_KEY = os.getenv('GEMINI_API_KEY', os.getenv('AI_API_KEY', ''))
GEMINI_API_KEY = AI_API_KEY
AI_BASE_URL = os.getenv('AI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/openai')
AI_API_VERSION = os.getenv('AI_API_VERSION', 'v1beta')
AI_CHAT_MODEL = os.getenv('AI_CHAT_MODEL', 'gemini-1.5-pro')
AI_DRAW_MODEL = os.getenv('AI_DRAW_MODEL', 'gemini-1.5-flash')
AI_ANALYSE_MODEL = os.getenv('AI_ANALYSE_MODEL', os.getenv('AI_CHAT_MODEL', 'gemini-1.5-pro'))
APIFY_API_TOKEN = os.getenv('APIFY_API_TOKEN', '')
GEMINI_CHAT_MODEL = AI_CHAT_MODEL
GEMINI_IMAGE_MODEL = os.getenv('GEMINI_IMAGE_MODEL', 'gemini-1.5-flash')

# ── Model Context Protocol (MCP) Configuration ───────────────────────
# List of URLs for remote MCP servers (SSE transport)
# Set via environment variable 'MCP_SERVERS=url1,url2'
_raw_servers = os.getenv('MCP_SERVERS', '')
MCP_SERVERS = []
if _raw_servers:
    MCP_SERVERS = [s.strip() for s in _raw_servers.split(',') if s.strip()]

# ── Local Stdio MCP Servers ──────────────────────────────────────────
# These servers execute locally via standard I/O (e.g. npx)
MCP_STDIO_SERVERS = [
    {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-everything"]
    }
]

_db_url = os.getenv('DATABASE_URL', '')
if _db_url.startswith('postgres'):
    MCP_STDIO_SERVERS.append({
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-postgres", _db_url]
    })

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.authentication.backend.SupabaseAuthentication',
    ],
    'EXCEPTION_HANDLER': 'config.error_handlers.custom_exception_handler',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    # ── Rate-limiting ──
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '20/minute',
        'user': '120/minute',
        'ai_chat': '30/minute',       # tighter limit for AI endpoints
        'ai_generate': '10/minute',    # Image generation → Gemini 3.1 Flash Image
    },
}

_cors_env = os.getenv('CORS_ALLOWED_ORIGINS', '')
if _cors_env:
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in _cors_env.split(',') if origin.strip()]
else:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'cache-control',          # needed for SSE
]


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

# Media files (User uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Logging ──────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'apps.ai_architecture': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    },
}

# ── Production Security (only when DEBUG=False) ─────────────────────
if not DEBUG:
    # HTTPS enforcement
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

    # Strict Transport Security (1 year)
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

    # Secure cookies
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True

    # CSRF trusted origins (required for POST requests behind reverse proxy)
    _csrf_origins = os.getenv('CSRF_TRUSTED_ORIGINS', '')
    if _csrf_origins:
        CSRF_TRUSTED_ORIGINS = [o.strip() for o in _csrf_origins.split(',') if o.strip()]

# ── Google Maps API ────────────────────────────────────────
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')

