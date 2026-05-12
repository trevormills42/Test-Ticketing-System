from django.core.mail import send_mail
from django.conf import settings


def _send(subject, body, recipient_list):
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'helpdesk@example.com')
    try:
        send_mail(subject, body, from_email, recipient_list, fail_silently=True)
    except Exception:
        pass


def send_ticket_created(ticket):
    subject = f"[{ticket.ticket_number}] Your ticket has been received"
    body = (
        f"Hi {ticket.requester_name},\n\n"
        f"We've received your ticket and will be in touch shortly.\n\n"
        f"Ticket: {ticket.ticket_number}\n"
        f"Title: {ticket.title}\n"
        f"Priority: {ticket.priority.title()}\n\n"
        f"You can check the status of your ticket at any time by visiting:\n"
        f"{getattr(settings, 'SITE_URL', '')}/status/{ticket.ticket_number}\n\n"
        f"Thank you,\nHelpDesk Pro"
    )
    _send(subject, body, [ticket.requester_email])


def send_ticket_assigned(ticket):
    if not ticket.assigned_to or not ticket.assigned_to.user.email:
        return
    agent = ticket.assigned_to
    subject = f"[{ticket.ticket_number}] Ticket assigned to you"
    body = (
        f"Hi {agent.user.get_full_name() or agent.user.username},\n\n"
        f"A ticket has been assigned to you.\n\n"
        f"Ticket: {ticket.ticket_number}\n"
        f"Title: {ticket.title}\n"
        f"Priority: {ticket.priority.title()}\n"
        f"Requester: {ticket.requester_name} <{ticket.requester_email}>\n\n"
        f"Thank you,\nHelpDesk Pro"
    )
    _send(subject, body, [agent.user.email])


def send_status_changed(ticket, old_status):
    subject = f"[{ticket.ticket_number}] Status updated: {ticket.status.replace('_', ' ').title()}"
    body = (
        f"Hi {ticket.requester_name},\n\n"
        f"Your ticket status has been updated.\n\n"
        f"Ticket: {ticket.ticket_number}\n"
        f"Title: {ticket.title}\n"
        f"Previous Status: {old_status.replace('_', ' ').title()}\n"
        f"New Status: {ticket.status.replace('_', ' ').title()}\n\n"
        f"Track your ticket: {getattr(settings, 'SITE_URL', '')}/status/{ticket.ticket_number}\n\n"
        f"Thank you,\nHelpDesk Pro"
    )
    _send(subject, body, [ticket.requester_email])


def send_comment_added(ticket, comment):
    if comment.is_internal:
        return
    subject = f"[{ticket.ticket_number}] New reply on your ticket"
    body = (
        f"Hi {ticket.requester_name},\n\n"
        f"A new reply has been added to your ticket.\n\n"
        f"Ticket: {ticket.ticket_number}\n"
        f"Title: {ticket.title}\n\n"
        f"Reply from {comment.author_name}:\n"
        f"---\n"
        f"{comment.content}\n"
        f"---\n\n"
        f"Track your ticket: {getattr(settings, 'SITE_URL', '')}/status/{ticket.ticket_number}\n\n"
        f"Thank you,\nHelpDesk Pro"
    )
    _send(subject, body, [ticket.requester_email])


def send_sla_escalation(ticket):
    escalation_email = getattr(settings, 'SLA_ESCALATION_EMAIL', None)
    if not escalation_email:
        return
    subject = f"[SLA BREACH] {ticket.ticket_number}: {ticket.title}"
    body = (
        f"ALERT: SLA has been breached for ticket {ticket.ticket_number}.\n\n"
        f"Title: {ticket.title}\n"
        f"Priority: {ticket.priority.title()}\n"
        f"Status: {ticket.status.replace('_', ' ').title()}\n"
        f"Requester: {ticket.requester_name} <{ticket.requester_email}>\n"
        f"SLA Deadline: {ticket.sla_deadline}\n"
        f"Assigned To: {ticket.assigned_to.user.get_full_name() if ticket.assigned_to else 'Unassigned'}\n\n"
        f"Immediate attention required.\n\nHelpDesk Pro"
    )
    _send(subject, body, [escalation_email])
