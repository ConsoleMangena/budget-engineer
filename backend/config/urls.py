from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('apps.core.urls')),
    path('api/v1/', include('apps.builder_dashboard.urls')),
    path('api/v1/', include('apps.contractor_dashboard.urls')),
    path('api/v1/', include('apps.supplier_dashboard.urls')),
    path('api/v1/auth/', include('apps.authentication.urls')),
    path('api/v1/billing/', include('apps.billing.urls')),
    path('api/v1/admin/', include('apps.admin_dashboard.urls')),
    path('api/v1/architectural-studio/', include('apps.architectural_studio.urls')),
]

# AI routes are optional in local/dev if optional deps (e.g. mcp, py>=3.10) are missing.
try:
    urlpatterns.append(path('api/v1/ai/', include('apps.ai_architecture.urls')))
except Exception:
    pass

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Custom error handlers
handler404 = 'config.error_handlers.handle_404'
handler500 = 'config.error_handlers.handle_500'
