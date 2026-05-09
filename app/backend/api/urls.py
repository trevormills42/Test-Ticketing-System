from django.urls import path
from api import views

urlpatterns = [
    # Tickets
    path('tickets/', views.TicketListCreateView.as_view(), name='ticket-list'),
    path('tickets/<uuid:id>/', views.TicketDetailView.as_view(), name='ticket-detail'),
    
    # Ticket Comments
    path('tickets/<uuid:ticket_id>/comments/', views.TicketCommentListCreateView.as_view(), name='ticket-comments'),
    
    # Agents
    path('agents/', views.AgentListView.as_view(), name='agent-list'),
    path('agents/<uuid:id>/', views.AgentDetailView.as_view(), name='agent-detail'),
    
    # Canned Responses
    path('canned-responses/', views.CannedResponseListCreateView.as_view(), name='canned-response-list'),
    path('canned-responses/<uuid:id>/', views.CannedResponseDetailView.as_view(), name='canned-response-detail'),
    
    # SLA Config
    path('sla-configs/', views.SLAConfigListView.as_view(), name='sla-config-list'),
    path('sla-configs/<uuid:id>/', views.SLAConfigDetailView.as_view(), name='sla-config-detail'),
    
    # Users
    path('users/', views.UserListView.as_view(), name='user-list'),
    
    # Dashboard / Analytics
    path('dashboard/stats/', views.dashboard_stats, name='dashboard-stats'),
    path('dashboard/by-status/', views.tickets_by_status, name='tickets-by-status'),
    path('dashboard/by-priority/', views.tickets_by_priority, name='tickets-by-priority'),
    path('dashboard/trend/', views.tickets_trend, name='tickets-trend'),
    path('dashboard/agent-performance/', views.agent_performance, name='agent-performance'),
    path('dashboard/resolution-by-priority/', views.resolution_time_by_priority, name='resolution-by-priority'),
]
