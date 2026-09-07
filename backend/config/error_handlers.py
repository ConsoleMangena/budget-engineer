"""
Custom error handlers for Africa ConTech Hub API
"""
from django.http import JsonResponse
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Custom exception handler for DRF that provides consistent error responses
    """
    # Call DRF's default exception handler first
    response = exception_handler(exc, context)

    if response is not None:
        # Customize the response format
        custom_response_data = {
            'error': True,
            'message': str(exc),
            'status_code': response.status_code,
        }

        # Add field-specific errors if they exist
        if isinstance(response.data, dict):
            if 'detail' in response.data:
                custom_response_data['detail'] = response.data['detail']
            else:
                custom_response_data['errors'] = response.data

        response.data = custom_response_data

    return response


def handle_404(request, exception=None):
    """
    Custom 404 handler
    """
    return JsonResponse({
        'error': True,
        'message': 'The requested resource was not found.',
        'status_code': 404,
        'path': request.path
    }, status=status.HTTP_404_NOT_FOUND)


def handle_500(request):
    """
    Custom 500 handler
    """
    return JsonResponse({
        'error': True,
        'message': 'An internal server error occurred. Please try again later.',
        'status_code': 500,
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
