from rest_framework import generics, status, filters
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Count, Q, Avg, F, ExpressionWrapper, DurationField, Case, When, Value, IntegerField
from django.utils import timezone
from django.db.models.functions import TruncDate
from datetime import timedelta

from tickets.models import Ticket, TicketComment, TicketActivity, Agent, CannedResponse, SLAConfig
from api.serializers import (
    TicketListSerializer, TicketDetailSerializer, TicketCreateSerializer,
    TicketCommentSerializer, TicketActivitySerializer,
    AgentSerializer, CannedResponseSerializer, SLAConfigSerializer,
    DashboardStatsSerializer, TicketCountByStatusSerializer,
    TicketCountByPrioritySerializer, AgentPerformanceSerializer,
    UserSerializer
)
from django.contrib.auth.models import User


# ==================== TICKETS ====================

class TicketListCreateView(generics.ListCreateAPIView):
    queryset = Ticket.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['ticket_number', 'title', 'requester_name', 'requester_email', 'description']
    ordering_fields = ['created_at', 'updated_at', 'priority', 'status']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TicketCreateSerializer
        return TicketListSerializer

    def get_queryset(self):
        queryset = Ticket.objects.all()
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            statuses = status_filter.split(',')
            queryset = queryset.filter(status__in=statuses)
        
        # Filter by priority
        priority_filter = self.request.query_params.get('priority')
        if priority_filter:
            priorities = priority_filter.split(',')
            queryset = queryset.filter(priority__in=priorities)
        
        # Filter by assigned agent
        assigned_to = self.request.query_params.get('assigned_to')
        if assigned_to:
            queryset = queryset.filter(assigned_to__id=assigned_to)
        
        # Filter by ticket type
        ticket_type = self.request.query_params.get('ticket_type')
        if ticket_type:
            queryset = queryset.filter(ticket_type=ticket_type)
        
        # Filter SLA status
        sla_status = self.request.query_params.get('sla_status')
        if sla_status == 'breached':
            queryset = queryset.filter(sla_breached=True)
        elif sla_status == 'warning':
            queryset = queryset.filter(sla_warning=True)
        
        return queryset.select_related('assigned_to__user').prefetch_related('comments')


class TicketDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Ticket.objects.all()
    serializer_class = TicketDetailSerializer
    lookup_field = 'id'

    def get_queryset(self):
        return Ticket.objects.select_related('assigned_to__user', 'sla_config').prefetch_related('comments', 'activities')

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_status = old_instance.status
        old_assigned = old_instance.assigned_to
        
        ticket = serializer.save()
        
        # Log activity for status change
        if old_status != ticket.status:
            TicketActivity.objects.create(
                ticket=ticket,
                actor_name='System',
                field_changed='status',
                old_value=old_status,
                new_value=ticket.status
            )
        
        # Log activity for assignment change
        if old_assigned != ticket.assigned_to:
            old_name = old_assigned.user.get_full_name() if old_assigned else 'Unassigned'
            new_name = ticket.assigned_to.user.get_full_name() if ticket.assigned_to else 'Unassigned'
            TicketActivity.objects.create(
                ticket=ticket,
                actor_name='System',
                field_changed='assigned_to',
                old_value=old_name,
                new_value=new_name
            )


# ==================== TICKET COMMENTS ====================

class TicketCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = TicketCommentSerializer

    def get_queryset(self):
        ticket_id = self.kwargs.get('ticket_id')
        return TicketComment.objects.filter(ticket__id=ticket_id)

    def perform_create(self, serializer):
        ticket_id = self.kwargs.get('ticket_id')
        ticket = Ticket.objects.get(id=ticket_id)
        comment = serializer.save(ticket=ticket)
        
        # Update first_responded_at if this is the first response
        if not ticket.first_responded_at:
            ticket.first_responded_at = timezone.now()
            ticket.save(update_fields=['first_responded_at'])
        
        return comment


# ==================== AGENTS ====================

class AgentListView(generics.ListAPIView):
    queryset = Agent.objects.filter(is_active=True)
    serializer_class = AgentSerializer


class AgentDetailView(generics.RetrieveUpdateAPIView):
    queryset = Agent.objects.all()
    serializer_class = AgentSerializer
    lookup_field = 'id'


# ==================== CANNED RESPONSES ====================

class CannedResponseListCreateView(generics.ListCreateAPIView):
    queryset = CannedResponse.objects.filter(is_active=True)
    serializer_class = CannedResponseSerializer

    def get_queryset(self):
        queryset = CannedResponse.objects.all()
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        active_only = self.request.query_params.get('active_only')
        if active_only and active_only.lower() == 'true':
            queryset = queryset.filter(is_active=True)
        return queryset


class CannedResponseDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CannedResponse.objects.all()
    serializer_class = CannedResponseSerializer
    lookup_field = 'id'


# ==================== SLA CONFIG ====================

class SLAConfigListView(generics.ListAPIView):
    queryset = SLAConfig.objects.filter(is_active=True)
    serializer_class = SLAConfigSerializer


class SLAConfigDetailView(generics.RetrieveUpdateAPIView):
    queryset = SLAConfig.objects.all()
    serializer_class = SLAConfigSerializer
    lookup_field = 'id'


# ==================== USERS ====================

class UserListView(generics.ListAPIView):
    queryset = User.objects.filter(is_active=True)
    serializer_class = UserSerializer


# ==================== DASHBOARD / ANALYTICS ====================

@api_view(['GET'])
def dashboard_stats(request):
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    total_tickets = Ticket.objects.count()
    open_tickets = Ticket.objects.filter(status='open').count()
    in_progress_tickets = Ticket.objects.filter(status='in_progress').count()
    pending_tickets = Ticket.objects.filter(status='pending').count()
    resolved_today = Ticket.objects.filter(resolved_at__gte=today_start).count()
    sla_breached_count = Ticket.objects.filter(sla_breached=True).exclude(status='closed').count()
    sla_warning_count = Ticket.objects.filter(sla_warning=True).exclude(status__in=['closed', 'resolved']).count()
    
    # Average resolution time
    resolved_tickets = Ticket.objects.filter(resolved_at__isnull=False)
    avg_resolution = resolved_tickets.annotate(
        resolution_time=ExpressionWrapper(
            F('resolved_at') - F('created_at'),
            output_field=DurationField()
        )
    ).aggregate(avg=Avg('resolution_time'))
    
    avg_hours = None
    if avg_resolution['avg']:
        avg_hours = round(avg_resolution['avg'].total_seconds() / 3600, 1)
    else:
        avg_hours = 0.0
    
    data = {
        'total_tickets': total_tickets,
        'open_tickets': open_tickets,
        'in_progress_tickets': in_progress_tickets,
        'pending_tickets': pending_tickets,
        'resolved_today': resolved_today,
        'sla_breached_count': sla_breached_count,
        'sla_warning_count': sla_warning_count,
        'avg_resolution_hours': avg_hours,
    }
    serializer = DashboardStatsSerializer(data)
    return Response(serializer.data)


@api_view(['GET'])
def tickets_by_status(request):
    queryset = Ticket.objects.values('status').annotate(count=Count('id'))
    serializer = TicketCountByStatusSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def tickets_by_priority(request):
    queryset = Ticket.objects.values('priority').annotate(count=Count('id'))
    serializer = TicketCountByPrioritySerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def tickets_trend(request):
    # Tickets created per day for the last 14 days
    days = int(request.query_params.get('days', 14))
    start_date = timezone.now() - timedelta(days=days)
    
    queryset = Ticket.objects.filter(created_at__gte=start_date).annotate(
        date=TruncDate('created_at')
    ).values('date').annotate(count=Count('id')).order_by('date')
    
    data = [{'date': str(item['date']), 'count': item['count']} for item in queryset]
    return Response(data)


@api_view(['GET'])
def agent_performance(request):
    agents = Agent.objects.filter(is_active=True)
    result = []
    
    for agent in agents:
        total = agent.assigned_tickets.count()
        resolved = agent.assigned_tickets.filter(status__in=['resolved', 'closed']).count()
        open_tix = agent.assigned_tickets.filter(status__in=['open', 'in_progress', 'pending']).count()
        
        # Average resolution time
        resolved_tix = agent.assigned_tickets.filter(resolved_at__isnull=False)
        avg_res = resolved_tix.annotate(
            resolution_time=ExpressionWrapper(
                F('resolved_at') - F('created_at'),
                output_field=DurationField()
            )
        ).aggregate(avg=Avg('resolution_time'))
        
        avg_hours = 0.0
        if avg_res['avg']:
            avg_hours = round(avg_res['avg'].total_seconds() / 3600, 1)
        
        result.append({
            'agent_id': agent.id,
            'agent_name': agent.user.get_full_name() or agent.user.username,
            'total_assigned': total,
            'resolved': resolved,
            'avg_resolution_hours': avg_hours,
            'open_tickets': open_tix,
        })
    
    serializer = AgentPerformanceSerializer(result, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def resolution_time_by_priority(request):
    queryset = Ticket.objects.filter(resolved_at__isnull=False).values('priority').annotate(
        avg_hours=Avg(
            ExpressionWrapper(
                F('resolved_at') - F('created_at'),
                output_field=DurationField()
            )
        )
    )
    
    result = []
    for item in queryset:
        hours = item['avg_hours'].total_seconds() / 3600 if item['avg_hours'] else 0
        result.append({
            'priority': item['priority'],
            'avg_hours': round(hours, 1)
        })
    return Response(result)
