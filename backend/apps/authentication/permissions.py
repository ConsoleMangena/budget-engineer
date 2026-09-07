from rest_framework import permissions


class IsApproved(permissions.BasePermission):
    """
    Allows access only to users whose account has been approved by an admin.
    """
    message = 'Your account is pending approval.'

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False
        return request.user.profile.is_approved is True


class IsBuilder(permissions.BasePermission):
    """
    Allows access only to approved users with the BUILDER role.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False
        profile = request.user.profile
        return profile.is_approved and profile.role == 'BUILDER'


class IsContractor(permissions.BasePermission):
    """
    Allows access only to approved users with the CONTRACTOR role.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False
        profile = request.user.profile
        return profile.is_approved and profile.role == 'CONTRACTOR'


class IsSupplier(permissions.BasePermission):
    """
    Allows access only to approved users with the SUPPLIER role.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False
        profile = request.user.profile
        return profile.is_approved and profile.role == 'SUPPLIER'


class IsAdmin(permissions.BasePermission):
    """
    Allows access only to users with the ADMIN role (admins bypass approval check).
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False
        return request.user.profile.role == 'ADMIN'
