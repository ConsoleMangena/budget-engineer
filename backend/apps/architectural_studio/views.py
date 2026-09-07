import math
import requests as http_requests

from django.conf import settings as django_settings
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes as perm_classes
from rest_framework.response import Response

from .models import ArchitecturalStudioItem
from .serializers import ArchitecturalStudioItemSerializer
from apps.authentication.permissions import IsBuilder


class ArchitecturalStudioItemViewSet(viewsets.ModelViewSet):
    serializer_class = ArchitecturalStudioItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuilder]

    def get_queryset(self):
        return ArchitecturalStudioItem.objects.filter(project__owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save()


# ── Google Elevation API proxy ─────────────────────────────
# Samples an NxN grid of elevation points around a lat/lng center.
# Returns { grid_size, radius_m, elevations: [[row0], [row1], ...], min, max }

@api_view(['GET'])
@perm_classes([permissions.IsAuthenticated])
def elevation_grid(request):
    api_key = django_settings.GOOGLE_MAPS_API_KEY
    if not api_key:
        return Response(
            {'error': 'Google Maps API key not configured. Set GOOGLE_MAPS_API_KEY in .env'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    try:
        lat = float(request.query_params.get('lat', 0))
        lng = float(request.query_params.get('lng', 0))
        radius = float(request.query_params.get('radius', 100))  # meters
        grid_size = int(request.query_params.get('grid_size', 20))
    except (ValueError, TypeError):
        return Response({'error': 'Invalid parameters'}, status=status.HTTP_400_BAD_REQUEST)

    grid_size = min(max(grid_size, 5), 30)  # clamp 5–30
    radius = min(max(radius, 20), 500)      # clamp 20–500m

    # Convert radius in meters to degrees (approximate)
    lat_deg_per_m = 1.0 / 111_320.0
    lng_deg_per_m = 1.0 / (111_320.0 * math.cos(math.radians(lat)))

    # Build grid of lat/lng points
    locations = []
    for row in range(grid_size):
        for col in range(grid_size):
            # -1 to +1 across the grid
            fx = -1.0 + 2.0 * col / (grid_size - 1)
            fz = -1.0 + 2.0 * row / (grid_size - 1)
            pt_lat = lat + fz * radius * lat_deg_per_m
            pt_lng = lng + fx * radius * lng_deg_per_m
            locations.append(f'{pt_lat:.7f},{pt_lng:.7f}')

    # Google Elevation API accepts max 512 locations per request
    # For 30x30=900 we may need to batch
    all_elevations = []
    batch_size = 500
    for i in range(0, len(locations), batch_size):
        batch = locations[i:i + batch_size]
        url = (
            f'https://maps.googleapis.com/maps/api/elevation/json'
            f'?locations={"|".join(batch)}'
            f'&key={api_key}'
        )
        resp = http_requests.get(url, timeout=15)
        data = resp.json()
        if data.get('status') != 'OK':
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'Google Elevation API error: status={data.get("status")}, msg={data.get("error_message", "")}, http={resp.status_code}')
            return Response(
                {'error': f'Google API error: {data.get("status", "unknown")}', 'detail': data.get('error_message', '')},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        for result in data['results']:
            all_elevations.append(round(result['elevation'], 2))

    # Reshape into 2D grid [row][col]
    grid = []
    for row in range(grid_size):
        grid.append(all_elevations[row * grid_size:(row + 1) * grid_size])

    elev_min = min(all_elevations)
    elev_max = max(all_elevations)

    return Response({
        'grid_size': grid_size,
        'radius_m': radius,
        'center': {'lat': lat, 'lng': lng},
        'elevations': grid,
        'min': elev_min,
        'max': elev_max,
    })
