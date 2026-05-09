from rest_framework import serializers
from tickets.models import Ticket, TicketComment, TicketActivity, Agent, CannedResponse, SLAConfig
from django.contrib.auth.models import User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'is_staff']


class AgentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    ticket_count = serializers.SerializerMethodField()
    open_ticket_count = serializers.SerializerMethodField()

    class Meta:
        model = Agent
        fields = ['id', 'user', 'role', 'department', 'phone', 'is_active', 
                  'ticket_count', 'open_ticket_count', 'created_at']

    def get_ticket_count(self, obj):
        return obj.assigned_tickets.count()

    def get_open_ticket_count(self, obj):
        return obj.assigned_tickets.filter(status__in=['open', 'in_progress', 'pending']).count()


class SLAConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SLAConfig
        fields = ['id', 'priority', 'response_time_minutes', 'resolution_time_minutes',
                  'warning_threshold_percent', 'is_active', 'created_at', 'updated_at']


class TicketCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketComment
        fields = ['id', 'ticket', 'author_name', 'author_email', 'is_internal', 
                  'content', 'created_at']
        read_only_fields = ['ticket', 'created_at']


class TicketActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketActivity
        fields = ['id', 'ticket', 'actor_name', 'field_changed', 'old_value', 
                  'new_value', 'created_at']


class TicketListSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.user.get_full_name', 
                                              read_only=True, default='')
    assigned_to_id = serializers.UUIDField(source='assigned_to.id', read_only=True, default=None)
    comments_count = serializers.SerializerMethodField()
    sla_status = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = ['id', 'ticket_number', 'title', 'status', 'priority', 'ticket_type',
                  'requester_name', 'requester_email', 'assigned_to_name', 'assigned_to_id',
                  'sla_deadline', 'sla_breached', 'sla_warning', 'resolved_at',
                  'comments_count', 'sla_status', 'created_at', 'updated_at']

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_sla_status(self, obj):
        if obj.sla_breached:
            return 'breached'
        elif obj.sla_warning:
            return 'warning'
        return 'ok'


class TicketDetailSerializer(serializers.ModelSerializer):
    assigned_to = AgentSerializer(read_only=True)
    assigned_to_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    comments = TicketCommentSerializer(many=True, read_only=True)
    activities = TicketActivitySerializer(many=True, read_only=True)
    sla_config = SLAConfigSerializer(read_only=True)
    sla_status = serializers.SerializerMethodField()
    time_to_resolution = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = ['id', 'ticket_number', 'title', 'description', 'status', 'priority', 
                  'ticket_type', 'requester_name', 'requester_email', 'requester_phone',
                  'assigned_to', 'assigned_to_id', 'created_by', 'sla_config', 
                  'sla_deadline', 'sla_breached', 'sla_warning', 'first_responded_at',
                  'resolved_at', 'source', 'tags', 'comments', 'activities',
                  'sla_status', 'time_to_resolution', 'created_at', 'updated_at']

    def get_sla_status(self, obj):
        if obj.sla_breached:
            return 'breached'
        elif obj.sla_warning:
            return 'warning'
        return 'ok'

    def get_time_to_resolution(self, obj):
        if obj.resolved_at and obj.created_at:
            delta = obj.resolved_at - obj.created_at
            hours = delta.total_seconds() / 3600
            return round(hours, 1)
        return None

    def update(self, instance, validated_data):
        assigned_to_id = validated_data.pop('assigned_to_id', None)
        if assigned_to_id:
            try:
                agent = Agent.objects.get(id=assigned_to_id)
                instance.assigned_to = agent
            except Agent.DoesNotExist:
                pass
        elif assigned_to_id is None and 'assigned_to_id' in self.initial_data:
            instance.assigned_to = None
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class TicketCreateSerializer(serializers.ModelSerializer):
    assigned_to_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Ticket
        fields = ['title', 'description', 'priority', 'ticket_type',
                  'requester_name', 'requester_email', 'requester_phone',
                  'assigned_to_id', 'source', 'tags']

    def create(self, validated_data):
        assigned_to_id = validated_data.pop('assigned_to_id', None)
        ticket = Ticket.objects.create(**validated_data)
        
        if assigned_to_id:
            try:
                agent = Agent.objects.get(id=assigned_to_id)
                ticket.assigned_to = agent
                ticket.save()
            except Agent.DoesNotExist:
                pass
        
        return ticket


class CannedResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = CannedResponse
        fields = ['id', 'title', 'content', 'category', 'is_active', 
                  'created_at', 'updated_at']


class DashboardStatsSerializer(serializers.Serializer):
    total_tickets = serializers.IntegerField()
    open_tickets = serializers.IntegerField()
    in_progress_tickets = serializers.IntegerField()
    pending_tickets = serializers.IntegerField()
    resolved_today = serializers.IntegerField()
    sla_breached_count = serializers.IntegerField()
    sla_warning_count = serializers.IntegerField()
    avg_resolution_hours = serializers.FloatField()


class TicketCountByStatusSerializer(serializers.Serializer):
    status = serializers.CharField()
    count = serializers.IntegerField()


class TicketCountByPrioritySerializer(serializers.Serializer):
    priority = serializers.CharField()
    count = serializers.IntegerField()


class AgentPerformanceSerializer(serializers.Serializer):
    agent_id = serializers.UUIDField()
    agent_name = serializers.CharField()
    total_assigned = serializers.IntegerField()
    resolved = serializers.IntegerField()
    avg_resolution_hours = serializers.FloatField()
    open_tickets = serializers.IntegerField()
