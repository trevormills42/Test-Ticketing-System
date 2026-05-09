import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'helpdesk.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth.models import User
from tickets.models import Agent, SLAConfig, CannedResponse, Ticket, TicketComment, TicketActivity
from django.utils import timezone
import random
from datetime import timedelta


def create_users():
    """Create sample users and agents"""
    users_data = [
        {'username': 'admin', 'email': 'admin@helpdesk.com', 'first_name': 'System', 'last_name': 'Admin', 'password': 'admin123', 'role': 'admin'},
        {'username': 'sarah.chen', 'email': 'sarah@helpdesk.com', 'first_name': 'Sarah', 'last_name': 'Chen', 'password': 'agent123', 'role': 'agent'},
        {'username': 'mike.rodriguez', 'email': 'mike@helpdesk.com', 'first_name': 'Mike', 'last_name': 'Rodriguez', 'password': 'agent123', 'role': 'agent'},
        {'username': 'james.wilson', 'email': 'james@helpdesk.com', 'first_name': 'James', 'last_name': 'Wilson', 'password': 'agent123', 'role': 'agent'},
        {'username': 'lisa.thompson', 'email': 'lisa@helpdesk.com', 'first_name': 'Lisa', 'last_name': 'Thompson', 'password': 'agent123', 'role': 'agent'},
        {'username': 'david.kim', 'email': 'david@helpdesk.com', 'first_name': 'David', 'last_name': 'Kim', 'password': 'agent123', 'role': 'agent'},
    ]
    
    agents = []
    for ud in users_data:
        user, created = User.objects.get_or_create(
            username=ud['username'],
            defaults={
                'email': ud['email'],
                'first_name': ud['first_name'],
                'last_name': ud['last_name'],
            }
        )
        if created:
            user.set_password(ud['password'])
            user.save()
            print(f"Created user: {ud['username']}")
        
        agent, created = Agent.objects.get_or_create(
            user=user,
            defaults={
                'role': ud['role'],
                'department': random.choice(['IT Support', 'Customer Service', 'Technical', 'Billing']),
                'is_active': True,
            }
        )
        agents.append(agent)
        if created:
            print(f"Created agent: {agent}")
    
    return agents


def create_sla_configs():
    """Create SLA configurations"""
    sla_data = [
        {'priority': 'low', 'response_time_minutes': 480, 'resolution_time_minutes': 2880, 'warning_threshold_percent': 80},
        {'priority': 'medium', 'response_time_minutes': 240, 'resolution_time_minutes': 1440, 'warning_threshold_percent': 80},
        {'priority': 'high', 'response_time_minutes': 60, 'resolution_time_minutes': 480, 'warning_threshold_percent': 75},
        {'priority': 'critical', 'response_time_minutes': 15, 'resolution_time_minutes': 120, 'warning_threshold_percent': 70},
    ]
    
    for sd in sla_data:
        SLAConfig.objects.get_or_create(
            priority=sd['priority'],
            defaults=sd
        )
        print(f"Created SLA config: {sd['priority']}")


def create_canned_responses():
    """Create canned responses"""
    canned_data = [
        {'title': 'Acknowledge Receipt', 'content': 'Thank you for contacting our support team. We have received your request and are reviewing it. We will get back to you shortly with an update.', 'category': 'General'},
        {'title': 'Escalation Notice', 'content': 'Your ticket has been escalated to our senior technical team for further investigation. We appreciate your patience and will provide an update within the next 2 hours.', 'category': 'Escalation'},
        {'title': 'Password Reset Instructions', 'content': 'To reset your password, please follow these steps:\n1. Go to the login page\n2. Click "Forgot Password"\n3. Enter your email address\n4. Check your inbox for the reset link\n5. Create a new secure password\n\nIf you do not receive the email within 5 minutes, please check your spam folder.', 'category': 'Technical'},
        {'title': 'Request More Information', 'content': 'Thank you for reaching out. To help us resolve your issue more efficiently, could you please provide the following additional information:\n\n- Your account number or username\n- Screenshots of any error messages\n- Steps to reproduce the issue\n- Browser and operating system version\n\nWe look forward to your response.', 'category': 'General'},
        {'title': 'Issue Resolved - Confirmation', 'content': 'We are pleased to inform you that your issue has been resolved. The fix has been applied to your account.\n\nPlease verify that everything is working as expected. If you continue to experience any issues, please let us know immediately.\n\nThank you for your patience.', 'category': 'Resolution'},
        {'title': 'Maintenance Window Notice', 'content': 'Please be advised that we have scheduled maintenance for our systems.\n\nMaintenance Window: [DATE] from [START TIME] to [END TIME] UTC\n\nDuring this period, some services may be temporarily unavailable. We recommend planning your work accordingly.\n\nWe apologize for any inconvenience caused.', 'category': 'Maintenance'},
        {'title': 'Access Request Approved', 'content': 'Your access request has been reviewed and approved. You now have the requested permissions assigned to your account.\n\nPlease log out and log back in for the changes to take effect. If you need any additional access, please submit a new request.', 'category': 'Access Management'},
        {'title': 'Refund Processing', 'content': 'Your refund request has been approved and is being processed. The refund will be credited to your original payment method within 5-7 business days.\n\nRefund Amount: [AMOUNT]\nReference Number: [REF]\n\nYou will receive a confirmation email once the refund has been initiated.', 'category': 'Billing'},
    ]
    
    for cd in canned_data:
        CannedResponse.objects.get_or_create(
            title=cd['title'],
            defaults=cd
        )
        print(f"Created canned response: {cd['title']}")


def create_tickets(agents):
    """Create sample tickets"""
    ticket_data = [
        {'title': 'Cannot access email account', 'description': 'I am unable to log into my email account since this morning. Getting an authentication error. Please help urgently.', 'priority': 'high', 'status': 'in_progress', 'ticket_type': 'incident', 'requester_name': 'John Anderson', 'requester_email': 'john@company.com'},
        {'title': 'Request for VPN access', 'description': 'I need VPN access to work remotely starting next week. My manager has approved this request.', 'priority': 'medium', 'status': 'open', 'ticket_type': 'service_request', 'requester_name': 'Emily Parker', 'requester_email': 'emily@company.com'},
        {'title': 'Server downtime in production', 'description': 'The main application server appears to be down. All users are reporting 503 errors. This is critical!', 'priority': 'critical', 'status': 'in_progress', 'ticket_type': 'incident', 'requester_name': 'Robert Taylor', 'requester_email': 'robert@company.com'},
        {'title': 'Printer not working on 3rd floor', 'description': 'The shared printer on the 3rd floor is showing a paper jam error even though there is no paper stuck.', 'priority': 'low', 'status': 'pending', 'ticket_type': 'incident', 'requester_name': 'Amanda White', 'requester_email': 'amanda@company.com'},
        {'title': 'Software license renewal', 'description': 'Our Adobe Creative Cloud license is expiring at the end of the month. Need to process the renewal for 5 seats.', 'priority': 'medium', 'status': 'open', 'ticket_type': 'service_request', 'requester_name': 'Chris Martinez', 'requester_email': 'chris@company.com'},
        {'title': 'Database connection timeout', 'description': 'Getting frequent connection timeout errors when accessing the customer database. This started happening after the last update.', 'priority': 'high', 'status': 'in_progress', 'ticket_type': 'problem', 'requester_name': 'Nancy Lee', 'requester_email': 'nancy@company.com'},
        {'title': 'New employee onboarding - IT setup', 'description': 'Please set up a new laptop and accounts for our new hire starting on Monday. Need email, Slack, and Jira access.', 'priority': 'medium', 'status': 'open', 'ticket_type': 'service_request', 'requester_name': 'HR Department', 'requester_email': 'hr@company.com'},
        {'title': 'Network slowness reported', 'description': 'Multiple users reporting very slow internet speeds in the east wing of the building. Downloads are taking forever.', 'priority': 'high', 'status': 'in_progress', 'ticket_type': 'incident', 'requester_name': 'IT Monitor', 'requester_email': 'itmonitor@company.com'},
        {'title': 'Backup verification failure', 'description': 'Last night\'s backup job completed but the verification step failed. Need to investigate the backup integrity.', 'priority': 'high', 'status': 'open', 'ticket_type': 'problem', 'requester_name': 'System Admin', 'requester_email': 'sysadmin@company.com'},
        {'title': 'Keyboard replacement needed', 'description': 'My keyboard has several keys that are not working properly. Need a replacement for my workstation.', 'priority': 'low', 'status': 'resolved', 'ticket_type': 'service_request', 'requester_name': 'Kevin Brown', 'requester_email': 'kevin@company.com'},
        {'title': 'Two-factor authentication issues', 'description': 'I lost my phone and cannot access my 2FA codes. Need help resetting my two-factor authentication.', 'priority': 'medium', 'status': 'in_progress', 'ticket_type': 'incident', 'requester_name': 'Sarah Johnson', 'requester_email': 'sarah.j@company.com'},
        {'title': 'Security patch deployment', 'description': 'Need to deploy the latest security patches to all Windows workstations. Critical security update from Microsoft.', 'priority': 'critical', 'status': 'open', 'ticket_type': 'change', 'requester_name': 'Security Team', 'requester_email': 'security@company.com'},
        {'title': 'Email signature template update', 'description': 'Marketing has provided a new email signature template. Need to deploy this to all staff mailboxes.', 'priority': 'low', 'status': 'pending', 'ticket_type': 'service_request', 'requester_name': 'Marketing Dept', 'requester_email': 'marketing@company.com'},
        {'title': 'CRM integration error', 'description': 'The Salesforce integration is failing with API rate limit errors. Customer data is not syncing properly.', 'priority': 'high', 'status': 'in_progress', 'ticket_type': 'problem', 'requester_name': 'Sales Team', 'requester_email': 'sales@company.com'},
        {'title': 'Monitor flickering issue', 'description': 'My external monitor keeps flickering and going black for a few seconds. Tried different cables but issue persists.', 'priority': 'low', 'status': 'open', 'ticket_type': 'incident', 'requester_name': 'Tom Wilson', 'requester_email': 'tom@company.com'},
        {'title': 'Account locked after password attempts', 'description': 'I accidentally entered my password wrong too many times and now my account is locked. Need it unlocked urgently.', 'priority': 'high', 'status': 'resolved', 'ticket_type': 'incident', 'requester_name': 'Jessica Davis', 'requester_email': 'jessica@company.com'},
        {'title': 'Request for second monitor', 'description': 'I would like to request a second monitor for my workstation to improve productivity. My manager has approved.', 'priority': 'low', 'status': 'closed', 'ticket_type': 'service_request', 'requester_name': 'Alex Garcia', 'requester_email': 'alex@company.com'},
        {'title': 'SSL certificate renewal', 'description': 'The SSL certificate for our public website expires in 7 days. Need to renew it before it expires.', 'priority': 'high', 'status': 'in_progress', 'ticket_type': 'change', 'requester_name': 'Web Team', 'requester_email': 'web@company.com'},
        {'title': 'WiFi not connecting in conference room B', 'description': 'The WiFi in conference room B is not allowing connections. Says "Cannot obtain IP address".', 'priority': 'medium', 'status': 'open', 'ticket_type': 'incident', 'requester_name': 'Meeting Room', 'requester_email': 'facilities@company.com'},
        {'title': 'Data export request', 'description': 'Need to export all customer transaction data from Q1 2024 for the audit team. Please provide in CSV format.', 'priority': 'medium', 'status': 'pending', 'ticket_type': 'service_request', 'requester_name': 'Audit Team', 'requester_email': 'audit@company.com'},
        {'title': 'Application crash on startup', 'description': 'The internal HR portal crashes immediately when I try to open it. Gets an error code 0xC0000005.', 'priority': 'high', 'status': 'in_progress', 'ticket_type': 'incident', 'requester_name': 'Patricia Moore', 'requester_email': 'patricia@company.com'},
        {'title': 'Firewall rule request', 'description': 'Need to open port 8080 for the new development environment. Security team has reviewed and approved.', 'priority': 'medium', 'status': 'resolved', 'ticket_type': 'change', 'requester_name': 'Dev Team', 'requester_email': 'dev@company.com'},
        {'title': 'Headphones not detected', 'description': 'My USB headphones are not being detected by the system. Tried different USB ports but no luck.', 'priority': 'low', 'status': 'open', 'ticket_type': 'incident', 'requester_name': 'Daniel Jackson', 'requester_email': 'daniel@company.com'},
    ]
    
    statuses = ['open', 'in_progress', 'pending', 'resolved', 'closed']
    now = timezone.now()
    
    for i, td in enumerate(ticket_data):
        # Create with historical dates
        days_ago = random.randint(0, 10)
        hours_ago = random.randint(0, 23)
        created_time = now - timedelta(days=days_ago, hours=hours_ago)
        
        # Determine SLA based on priority
        sla_config = SLAConfig.objects.get(priority=td['priority'])
        sla_deadline = created_time + timedelta(minutes=sla_config.resolution_time_minutes)
        
        # Check SLA status
        sla_breached = now > sla_deadline and td['status'] not in ['resolved', 'closed']
        warning_time = sla_deadline - timedelta(minutes=int(sla_config.resolution_time_minutes * (1 - sla_config.warning_threshold_percent / 100)))
        sla_warning = now > warning_time and not sla_breached and td['status'] not in ['resolved', 'closed']
        
        ticket = Ticket.objects.create(
            title=td['title'],
            description=td['description'],
            status=td['status'],
            priority=td['priority'],
            ticket_type=td['ticket_type'],
            requester_name=td['requester_name'],
            requester_email=td['requester_email'],
            assigned_to=random.choice(agents[1:]) if random.random() > 0.2 else None,
            sla_config=sla_config,
            sla_deadline=sla_deadline,
            sla_breached=sla_breached,
            sla_warning=sla_warning,
            source=random.choice(['web', 'email', 'phone', 'chat']),
            tags=random.sample(['urgent', 'follow-up', 'external', 'recurring', 'after-hours'], k=random.randint(0, 2)),
        )
        
        # Override auto_now_add
        Ticket.objects.filter(id=ticket.id).update(created_at=created_time)
        ticket.refresh_from_db()
        
        if td['status'] in ['resolved', 'closed']:
            resolved_time = created_time + timedelta(hours=random.randint(1, 48))
            Ticket.objects.filter(id=ticket.id).update(
                resolved_at=resolved_time,
                first_responded_at=created_time + timedelta(minutes=random.randint(5, 120))
            )
        elif td['status'] == 'in_progress':
            Ticket.objects.filter(id=ticket.id).update(
                first_responded_at=created_time + timedelta(minutes=random.randint(5, 120))
            )
        
        # Add comments
        num_comments = random.randint(0, 3)
        for j in range(num_comments):
            comment_time = created_time + timedelta(hours=random.randint(1, 24 * (days_ago + 1)))
            if comment_time > now:
                comment_time = now - timedelta(hours=1)
            
            TicketComment.objects.create(
                ticket=ticket,
                author_name=ticket.assigned_to.user.get_full_name() if ticket.assigned_to else 'System',
                content=random.choice([
                    'Looking into this issue now.',
                    'I need some more information to proceed.',
                    'This has been escalated to the relevant team.',
                    'A fix has been applied, please verify.',
                    'Working on a solution, will update shortly.',
                ]),
                is_internal=random.random() > 0.7,
            )
        
        # Add activities
        TicketActivity.objects.create(
            ticket=ticket,
            actor_name='System',
            field_changed='status',
            old_value='',
            new_value=td['status']
        )
        
        if ticket.assigned_to:
            TicketActivity.objects.create(
                ticket=ticket,
                actor_name='System',
                field_changed='assigned_to',
                old_value='Unassigned',
                new_value=ticket.assigned_to.user.get_full_name()
            )
        
        print(f"Created ticket: {ticket.ticket_number} - {ticket.title}")


def main():
    print("Starting database seed...")
    
    # Clear existing data
    TicketComment.objects.all().delete()
    TicketActivity.objects.all().delete()
    Ticket.objects.all().delete()
    Agent.objects.all().delete()
    User.objects.filter(is_superuser=False).delete()
    
    print("\nCreating users and agents...")
    agents = create_users()
    
    print("\nCreating SLA configs...")
    create_sla_configs()
    
    print("\nCreating canned responses...")
    create_canned_responses()
    
    print("\nCreating tickets...")
    create_tickets(agents)
    
    print("\nSeed complete!")


if __name__ == '__main__':
    main()
