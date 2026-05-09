from django.db import models
from django.contrib.auth.models import User
import uuid


class Agent(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('agent', 'Agent'),
        ('viewer', 'Viewer'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='agent_profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='agent')
    department = models.CharField(max_length=100, blank=True, default='')
    phone = models.CharField(max_length=50, blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'agents'

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} ({self.role})"


class SLAConfig(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, unique=True)
    response_time_minutes = models.IntegerField(default=240)
    resolution_time_minutes = models.IntegerField(default=480)
    warning_threshold_percent = models.IntegerField(default=80, help_text="Percentage of SLA time to trigger warning")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sla_configs'

    def __str__(self):
        return f"SLA - {self.priority}"


class Ticket(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('pending', 'Pending'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    TICKET_TYPE_CHOICES = [
        ('incident', 'Incident'),
        ('service_request', 'Service Request'),
        ('problem', 'Problem'),
        ('change', 'Change'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket_number = models.CharField(max_length=20, unique=True, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    ticket_type = models.CharField(max_length=20, choices=TICKET_TYPE_CHOICES, default='incident')
    
    requester_name = models.CharField(max_length=150)
    requester_email = models.EmailField()
    requester_phone = models.CharField(max_length=50, blank=True, default='')
    
    assigned_to = models.ForeignKey(Agent, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_tickets')
    
    sla_config = models.ForeignKey(SLAConfig, on_delete=models.SET_NULL, null=True, blank=True)
    sla_deadline = models.DateTimeField(null=True, blank=True)
    sla_breached = models.BooleanField(default=False)
    sla_warning = models.BooleanField(default=False)
    first_responded_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    source = models.CharField(max_length=50, default='web', blank=True)
    tags = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tickets'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.ticket_number}: {self.title}"

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            count = Ticket.objects.count() + 1
            self.ticket_number = f"TKT-{count:05d}"
        super().save(*args, **kwargs)


class TicketComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='comments')
    author_name = models.CharField(max_length=150)
    author_email = models.EmailField(blank=True, default='')
    is_internal = models.BooleanField(default=False, help_text="Internal notes are not visible to requester")
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ticket_comments'
        ordering = ['-created_at']

    def __str__(self):
        return f"Comment on {self.ticket.ticket_number}"


class TicketActivity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='activities')
    actor_name = models.CharField(max_length=150)
    field_changed = models.CharField(max_length=100)
    old_value = models.CharField(max_length=500, blank=True, default='')
    new_value = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ticket_activities'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.field_changed}: {self.old_value} -> {self.new_value}"


class CannedResponse(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    content = models.TextField()
    category = models.CharField(max_length=100, blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'canned_responses'
        ordering = ['category', 'title']

    def __str__(self):
        return self.title
