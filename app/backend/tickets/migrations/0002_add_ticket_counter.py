from django.db import migrations, models


def initialize_counter(apps, schema_editor):
    """Seed the counter to the highest existing ticket number so new tickets don't collide."""
    TicketCounter = apps.get_model('tickets', 'TicketCounter')
    Ticket = apps.get_model('tickets', 'Ticket')

    max_num = 0
    for ticket in Ticket.objects.all():
        if ticket.ticket_number and ticket.ticket_number.startswith('TKT-'):
            try:
                num = int(ticket.ticket_number[4:])
                max_num = max(max_num, num)
            except ValueError:
                pass

    TicketCounter.objects.create(pk=1, value=max_num)


def remove_counter(apps, schema_editor):
    TicketCounter = apps.get_model('tickets', 'TicketCounter')
    TicketCounter.objects.filter(pk=1).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='TicketCounter',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('value', models.PositiveIntegerField(default=0)),
            ],
            options={
                'db_table': 'ticket_counter',
            },
        ),
        migrations.RunPython(initialize_counter, reverse_code=remove_counter),
    ]
