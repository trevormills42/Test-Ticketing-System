from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from tickets.models import Ticket


class Command(BaseCommand):
    help = (
        'Recomputes sla_breached and sla_warning for all open tickets and sends '
        'escalation emails on first breach. Run on a schedule (e.g. every 5 minutes).'
    )

    def handle(self, *args, **options):
        from api.emails import send_sla_escalation

        now = timezone.now()

        active_tickets = (
            Ticket.objects
            .filter(sla_deadline__isnull=False)
            .exclude(status__in=['resolved', 'closed'])
            .select_related('sla_config', 'assigned_to__user')
        )

        newly_breached = []
        newly_warned = []
        to_clear = []
        to_escalate = []

        for ticket in active_tickets:
            should_breach = now > ticket.sla_deadline

            should_warn = False
            if not should_breach and ticket.sla_config:
                warn_fraction = 1 - ticket.sla_config.warning_threshold_percent / 100
                warn_minutes = ticket.sla_config.resolution_time_minutes * warn_fraction
                warn_boundary = ticket.sla_deadline - timedelta(minutes=warn_minutes)
                should_warn = now > warn_boundary

            if should_breach and not ticket.sla_breached:
                newly_breached.append(ticket.pk)
                if not ticket.sla_escalation_sent:
                    to_escalate.append(ticket)
            elif should_warn and not ticket.sla_warning and not ticket.sla_breached:
                newly_warned.append(ticket.pk)
            elif not should_breach and not should_warn and (ticket.sla_breached or ticket.sla_warning):
                to_clear.append(ticket.pk)

        breached_count = Ticket.objects.filter(pk__in=newly_breached).update(
            sla_breached=True, sla_warning=False
        )
        warned_count = Ticket.objects.filter(pk__in=newly_warned).update(sla_warning=True)
        cleared_count = Ticket.objects.filter(pk__in=to_clear).update(
            sla_breached=False, sla_warning=False
        )

        escalated_count = 0
        for ticket in to_escalate:
            send_sla_escalation(ticket)
            escalated_count += 1

        if to_escalate:
            Ticket.objects.filter(pk__in=[t.pk for t in to_escalate]).update(sla_escalation_sent=True)

        self.stdout.write(
            self.style.SUCCESS(
                f'SLA update complete: {breached_count} newly breached, '
                f'{warned_count} newly in warning, {cleared_count} cleared, '
                f'{escalated_count} escalation emails sent.'
            )
        )
