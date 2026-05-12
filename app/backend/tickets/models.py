from django.db import models, transaction
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
import uuid


class TicketCounter(models.Model):
    """Single-row counter used to generate collision-free ticket numbers."""
    value = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'ticket_counter'


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

    CLOSED_STATUSES = {'resolved', 'closed'}

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
    sla_escalation_sent = models.BooleanField(default=False)
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

    def compute_sla_fields(self):
        """Recompute sla_breached and sla_warning from the current time and deadline.

        Called on every save so stored flags stay accurate without a background job.
        The management command `update_sla_statuses` handles tickets that haven't
        been touched since their deadline passed.
        """
        if not self.sla_deadline or self.status in self.CLOSED_STATUSES:
            self.sla_breached = False
            self.sla_warning = False
            return

        now = timezone.now()
        self.sla_breached = now > self.sla_deadline

        if self.sla_breached:
            self.sla_warning = False
            return

        # sla_config_id check avoids a DB round-trip when no config is attached
        if self.sla_config_id:
            config = self.sla_config
            warn_minutes = config.resolution_time_minutes * (1 - config.warning_threshold_percent / 100)
            warn_boundary = self.sla_deadline - timedelta(minutes=warn_minutes)
            self.sla_warning = now > warn_boundary
        else:
            self.sla_warning = False

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            with transaction.atomic():
                counter, _ = TicketCounter.objects.select_for_update().get_or_create(
                    pk=1, defaults={'value': 0}
                )
                counter.value += 1
                counter.save(update_fields=['value'])
                self.ticket_number = f"TKT-{counter.value:05d}"

        self.compute_sla_fields()
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


class TicketAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey('Ticket', on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='attachments/%Y/%m/')
    filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100, blank=True, default='')
    size = models.PositiveIntegerField(default=0, help_text='File size in bytes')
    uploaded_by = models.CharField(max_length=150, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ticket_attachments'
        ordering = ['created_at']

    def __str__(self):
        return self.filename


class TicketRelation(models.Model):
    RELATION_CHOICES = [
        ('related', 'Related To'),
        ('blocks', 'Blocks'),
        ('blocked_by', 'Blocked By'),
        ('duplicates', 'Duplicates'),
        ('duplicated_by', 'Duplicated By'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    from_ticket = models.ForeignKey('Ticket', on_delete=models.CASCADE, related_name='outgoing_relations')
    to_ticket = models.ForeignKey('Ticket', on_delete=models.CASCADE, related_name='incoming_relations')
    relation_type = models.CharField(max_length=20, choices=RELATION_CHOICES, default='related')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ticket_relations'
        unique_together = [('from_ticket', 'to_ticket', 'relation_type')]
        ordering = ['created_at']

    def __str__(self):
        return f"{self.from_ticket.ticket_number} {self.relation_type} {self.to_ticket.ticket_number}"


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
