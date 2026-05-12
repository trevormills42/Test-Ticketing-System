from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from tickets.models import Ticket, TicketComment, TicketActivity, TicketAttachment, TicketRelation, Agent, CannedResponse, SLAConfig
from django.contrib.auth.models import User


def _compute_sla_status(sla_deadline, status, sla_config):
    """Return 'breached' | 'warning' | 'ok' computed from the current time.

    Uses the live deadline rather than stored boolean flags so the value is
    always accurate regardless of when the ticket was last saved.
    """
    if not sla_deadline or status in ('resolved', 'closed'):
        return 'ok'

    now = timezone.now()
    if now > sla_deadline:
        return 'breached'

    if sla_config:
        warn_minutes = sla_config.resolution_time_minutes * (1 - sla_config.warning_threshold_percent / 100)
        warn_boundary = sla_deadline - timedelta(minutes=warn_minutes)
        if now > warn_boundary:
            return 'warning'

    return 'ok'


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


class TicketAttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = TicketAttachment
        fields = ['id', 'ticket', 'file', 'filename', 'content_type', 'size',
                  'uploaded_by', 'url', 'created_at']
        read_only_fields = ['ticket', 'created_at']

    def get_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else None

    def create(self, validated_data):
        file_obj = validated_data.get('file')
        if file_obj and not validated_data.get('filename'):
            validated_data['filename'] = file_obj.name
        if file_obj and not validated_data.get('size'):
            validated_data['size'] = file_obj.size
        if file_obj and not validated_data.get('content_type'):
            validated_data['content_type'] = getattr(file_obj, 'content_type', '')
        return super().create(validated_data)


class TicketRelationSerializer(serializers.ModelSerializer):
    to_ticket_number = serializers.CharField(source='to_ticket.ticket_number', read_only=True)
    to_ticket_title = serializers.CharField(source='to_ticket.title', read_only=True)
    to_ticket_status = serializers.CharField(source='to_ticket.status', read_only=True)
    from_ticket_number = serializers.CharField(source='from_ticket.ticket_number', read_only=True)
    to_ticket_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = TicketRelation
        fields = ['id', 'from_ticket', 'from_ticket_number', 'to_ticket', 'to_ticket_id',
                  'to_ticket_number', 'to_ticket_title', 'to_ticket_status',
                  'relation_type', 'created_at']
        read_only_fields = ['from_ticket', 'to_ticket', 'created_at']

    def create(self, validated_data):
        to_ticket_id = validated_data.pop('to_ticket_id')
        try:
            to_ticket = Ticket.objects.get(id=to_ticket_id)
        except Ticket.DoesNotExist:
            raise serializers.ValidationError({'to_ticket_id': 'Ticket not found.'})
        return TicketRelation.objects.create(to_ticket=to_ticket, **validated_data)


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
        # sla_config is available via select_related in TicketListCreateView.get_queryset()
        return _compute_sla_status(obj.sla_deadline, obj.status, obj.sla_config if obj.sla_config_id else None)


class TicketDetailSerializer(serializers.ModelSerializer):
    assigned_to = AgentSerializer(read_only=True)
    assigned_to_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    comments = TicketCommentSerializer(many=True, read_only=True)
    activities = TicketActivitySerializer(many=True, read_only=True)
    attachments = TicketAttachmentSerializer(many=True, read_only=True)
    relations = serializers.SerializerMethodField()
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
                  'attachments', 'relations', 'sla_status', 'time_to_resolution',
                  'created_at', 'updated_at']

    def get_relations(self, obj):
        outgoing = TicketRelationSerializer(obj.outgoing_relations.select_related('to_ticket'), many=True).data
        incoming = TicketRelationSerializer(obj.incoming_relations.select_related('from_ticket', 'to_ticket'), many=True).data
        return {'outgoing': outgoing, 'incoming': incoming}

    def get_sla_status(self, obj):
        return _compute_sla_status(obj.sla_deadline, obj.status, obj.sla_config if obj.sla_config_id else None)

    def get_time_to_resolution(self, obj):
        if obj.resolved_at and obj.created_at:
            delta = obj.resolved_at - obj.created_at
            return round(delta.total_seconds() / 3600, 1)
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
        from django.utils import timezone as tz
        from datetime import timedelta

        assigned_to_id = validated_data.pop('assigned_to_id', None)

        # Auto-assign SLA config based on priority
        priority = validated_data.get('priority', 'medium')
        try:
            sla_config = SLAConfig.objects.get(priority=priority, is_active=True)
            validated_data['sla_config'] = sla_config
            validated_data['sla_deadline'] = tz.now() + timedelta(minutes=sla_config.resolution_time_minutes)
        except SLAConfig.DoesNotExist:
            pass

        ticket = Ticket.objects.create(**validated_data)

        if assigned_to_id:
            try:
                agent = Agent.objects.get(id=assigned_to_id)
                ticket.assigned_to = agent
                ticket.save(update_fields=['assigned_to'])
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


class BulkUpdateSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.UUIDField(), min_length=1)
    status = serializers.ChoiceField(choices=Ticket.STATUS_CHOICES, required=False)
    priority = serializers.ChoiceField(choices=Ticket.PRIORITY_CHOICES, required=False)
    assigned_to_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, data):
        if not any(k in data for k in ('status', 'priority', 'assigned_to_id')):
            raise serializers.ValidationError('At least one of status, priority, or assigned_to_id must be provided.')
        return data


class TicketStatusPortalSerializer(serializers.ModelSerializer):
    """Lightweight public serializer — no internal data."""
    sla_status = serializers.SerializerMethodField()
    public_comments = serializers.SerializerMethodField()
    assigned_to_name = serializers.CharField(source='assigned_to.user.get_full_name', read_only=True, default='')

    class Meta:
        model = Ticket
        fields = ['ticket_number', 'title', 'status', 'priority', 'ticket_type',
                  'requester_name', 'assigned_to_name', 'sla_deadline', 'sla_status',
                  'created_at', 'updated_at', 'public_comments']

    def get_sla_status(self, obj):
        return _compute_sla_status(obj.sla_deadline, obj.status, obj.sla_config if obj.sla_config_id else None)

    def get_public_comments(self, obj):
        public = obj.comments.filter(is_internal=False).order_by('created_at')
        return TicketCommentSerializer(public, many=True).data
