from django.contrib import admin
from tickets.models import Ticket, TicketComment, TicketActivity, Agent, CannedResponse, SLAConfig


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ['ticket_number', 'title', 'status', 'priority', 'assigned_to', 'created_at']
    list_filter = ['status', 'priority', 'ticket_type']
    search_fields = ['ticket_number', 'title', 'requester_name', 'requester_email']
    readonly_fields = ['ticket_number', 'created_at', 'updated_at']


@admin.register(Agent)
class AgentAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'department', 'is_active']
    list_filter = ['role', 'is_active']


@admin.register(CannedResponse)
class CannedResponseAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'is_active', 'created_at']
    list_filter = ['category', 'is_active']
    search_fields = ['title', 'content']


@admin.register(SLAConfig)
class SLAConfigAdmin(admin.ModelAdmin):
    list_display = ['priority', 'response_time_minutes', 'resolution_time_minutes', 'is_active']
    list_filter = ['priority', 'is_active']


admin.site.register(TicketComment)
admin.site.register(TicketActivity)
