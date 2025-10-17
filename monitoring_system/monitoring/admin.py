from django.contrib import admin
from .models import MonitoringAgent, SystemLog, Alert, UserSession, AgentRegistrationRequest
from django.utils import timezone

@admin.register(MonitoringAgent)
class MonitoringAgentAdmin(admin.ModelAdmin):
    list_display = ('hostname', 'username', 'ip_address', 'is_active', 'is_approved', 'last_seen')
    list_filter = ('is_active', 'is_approved', 'created_at')
    search_fields = ('hostname', 'username', 'ip_address')
    readonly_fields = ('created_at', 'last_seen', 'last_config_update')
    list_editable = ('is_active', 'is_approved')
    actions = ['activate_agents', 'deactivate_agents']

    def activate_agents(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"Activated {updated} agents")
    activate_agents.short_description = "Activate selected agents"

    def deactivate_agents(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"Deactivated {updated} agents")
    deactivate_agents.short_description = "Deactivate selected agents"

@admin.register(AgentRegistrationRequest)
class AgentRegistrationRequestAdmin(admin.ModelAdmin):
    list_display = ('hostname', 'username', 'ip_address', 'status', 'requested_at', 'agent_created')
    list_filter = ('status', 'requested_at')
    search_fields = ('hostname', 'username', 'ip_address')
    readonly_fields = ('requested_at', 'agent_created')
    actions = ['approve_requests', 'reject_requests', 'create_agents']
    
    def agent_created(self, obj):
        """Display whether a MonitoringAgent exists for this registration"""
        return MonitoringAgent.objects.filter(hostname=obj.hostname).exists()
    agent_created.boolean = True
    agent_created.short_description = 'Agent Created'

    def approve_requests(self, request, queryset):
        """Approve requests and create agents"""
        approved_count = 0
        for registration in queryset:
            if registration.status != 'approved':
                # Create agent if it doesn't exist
                if not MonitoringAgent.objects.filter(hostname=registration.hostname).exists():
                    agent = MonitoringAgent.objects.create(
                        hostname=registration.hostname,
                        username=registration.username,
                        ip_address=registration.ip_address,
                        encryption_password=registration.encryption_password,
                        is_approved=True,
                        is_active=True,
                        last_seen=timezone.now()
                    )
                    self.message_user(request, f"Created and approved agent: {registration.hostname}")
                else:
                    # Update existing agent to approved
                    agent = MonitoringAgent.objects.get(hostname=registration.hostname)
                    agent.is_approved = True
                    agent.is_active = True
                    agent.save()
                    self.message_user(request, f"Approved existing agent: {registration.hostname}")
                
                registration.status = 'approved'
                registration.save()
                approved_count += 1
            else:
                self.message_user(request, f"Registration {registration.hostname} is already approved", level='WARNING')
        
        self.message_user(request, f"Successfully approved {approved_count} registration requests")
    approve_requests.short_description = "✓ Approve requests and create agents"

    def reject_requests(self, request, queryset):
        """Reject registration requests"""
        rejected_count = 0
        for registration in queryset:
            if registration.status != 'rejected':
                registration.status = 'rejected'
                registration.save()
                rejected_count += 1
        
        self.message_user(request, f"Rejected {rejected_count} registration requests")
    reject_requests.short_description = "✗ Reject selected requests"

    def create_agents(self, request, queryset):
        """Create MonitoringAgent objects for approved registrations that don't have agents yet"""
        created_count = 0
        for registration in queryset:
            if registration.status == 'approved' and not MonitoringAgent.objects.filter(hostname=registration.hostname).exists():
                MonitoringAgent.objects.create(
                    hostname=registration.hostname,
                    username=registration.username,
                    ip_address=registration.ip_address,
                    encryption_password=registration.encryption_password,
                    is_approved=True,
                    is_active=True,
                    last_seen=timezone.now()
                )
                created_count += 1
                self.message_user(request, f"Created agent for: {registration.hostname}")
            elif MonitoringAgent.objects.filter(hostname=registration.hostname).exists():
                self.message_user(request, f"Agent already exists for: {registration.hostname}", level='WARNING')
            elif registration.status != 'approved':
                self.message_user(request, f"Registration not approved for: {registration.hostname}", level='ERROR')
        
        self.message_user(request, f"Created {created_count} new agents")
    create_agents.short_description = "➕ Create agents for approved registrations"

    def save_model(self, request, obj, form, change):
        """Automatically create MonitoringAgent when status is changed to approved in the edit form"""
        if change and 'status' in form.changed_data and obj.status == 'approved':
            if not MonitoringAgent.objects.filter(hostname=obj.hostname).exists():
                MonitoringAgent.objects.create(
                    hostname=obj.hostname,
                    username=obj.username,
                    ip_address=obj.ip_address,
                    encryption_password=obj.encryption_password,
                    is_approved=True,
                    is_active=True,
                    last_seen=timezone.now()
                )
                self.message_user(request, f"Automatically created MonitoringAgent for {obj.hostname}")
        
        super().save_model(request, obj, form, change)

@admin.register(SystemLog)
class SystemLogAdmin(admin.ModelAdmin):
    list_display = ('agent', 'timestamp', 'created_at')
    list_filter = ('timestamp', 'created_at', 'agent')
    search_fields = ('agent__hostname', 'data')
    readonly_fields = ('timestamp', 'created_at')
    date_hierarchy = 'timestamp'

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ('title', 'agent', 'level', 'triggered_at', 'resolved')
    list_filter = ('level', 'resolved', 'triggered_at', 'agent')
    search_fields = ('title', 'description', 'agent__hostname')
    readonly_fields = ('triggered_at',)
    list_editable = ('resolved',)
    actions = ['mark_resolved', 'mark_unresolved']

    def mark_resolved(self, request, queryset):
        updated = queryset.update(resolved=True, resolved_at=timezone.now())
        self.message_user(request, f"Marked {updated} alerts as resolved")
    mark_resolved.short_description = "✅ Mark selected alerts as resolved"

    def mark_unresolved(self, request, queryset):
        updated = queryset.update(resolved=False, resolved_at=None)
        self.message_user(request, f"Marked {updated} alerts as unresolved")
    mark_unresolved.short_description = "❌ Mark selected alerts as unresolved"

@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ('agent', 'username', 'host', 'login_time', 'terminal')
    list_filter = ('login_time', 'agent', 'username')
    search_fields = ('username', 'host', 'agent__hostname')
    readonly_fields = ('login_time', 'created_at')
    date_hierarchy = 'login_time'