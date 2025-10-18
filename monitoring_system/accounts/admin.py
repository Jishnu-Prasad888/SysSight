# accounts/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import CustomUser


@admin.action(description='Approve selected users')
def approve_users(modeladmin, request, queryset):
    for user in queryset.filter(is_approved=False):
        user.is_approved = True
        user.approved_at = timezone.now()
        user.approved_by = request.user
        user.save()
    modeladmin.message_user(request, f'{queryset.count()} users approved successfully.')


@admin.action(description='Revoke approval for selected users')
def revoke_approval(modeladmin, request, queryset):
    queryset.update(is_approved=False, approved_at=None, approved_by=None)
    modeladmin.message_user(request, f'{queryset.count()} users approval revoked.')


class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'username', 'first_name', 'last_name', 
                    'is_approved_badge', 'requested_at', 'is_staff')
    list_filter = ('is_approved', 'is_staff', 'is_superuser', 'is_active', 'requested_at')
    search_fields = ('email', 'username', 'first_name', 'last_name')
    ordering = ('-requested_at',)
    actions = [approve_users, revoke_approval]
    
    fieldsets = UserAdmin.fieldsets + (
        ('Approval Information', {
            'fields': ('is_approved', 'requested_at', 'approved_at', 'approved_by')
        }),
    )
    
    readonly_fields = ('requested_at', 'approved_at', 'approved_by')
    
    def is_approved_badge(self, obj):
        if obj.is_approved:
            return format_html(
                '<span style="background-color: #10b981; color: white; padding: 3px 10px; '
                'border-radius: 12px; font-size: 11px; font-weight: 600;">APPROVED</span>'
            )
        else:
            return format_html(
                '<span style="background-color: #f59e0b; color: white; padding: 3px 10px; '
                'border-radius: 12px; font-size: 11px; font-weight: 600;">PENDING</span>'
            )
    is_approved_badge.short_description = 'Status'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Show pending users first
        return qs.order_by('is_approved', '-requested_at')


admin.site.register(CustomUser, CustomUserAdmin)

# Customize admin site headers
admin.site.site_header = 'SysSight Administration'
admin.site.site_title = 'SysSight Admin'
admin.site.index_title = 'Welcome to SysSight Administration'