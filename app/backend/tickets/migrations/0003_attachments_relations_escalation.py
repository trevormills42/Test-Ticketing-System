from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0002_add_ticket_counter'),
    ]

    operations = [
        migrations.AddField(
            model_name='ticket',
            name='sla_escalation_sent',
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name='TicketAttachment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('file', models.FileField(upload_to='attachments/%Y/%m/')),
                ('filename', models.CharField(max_length=255)),
                ('content_type', models.CharField(blank=True, default='', max_length=100)),
                ('size', models.PositiveIntegerField(default=0, help_text='File size in bytes')),
                ('uploaded_by', models.CharField(blank=True, default='', max_length=150)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('ticket', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attachments', to='tickets.ticket')),
            ],
            options={
                'db_table': 'ticket_attachments',
                'ordering': ['created_at'],
            },
        ),
        migrations.CreateModel(
            name='TicketRelation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('relation_type', models.CharField(
                    choices=[
                        ('related', 'Related To'),
                        ('blocks', 'Blocks'),
                        ('blocked_by', 'Blocked By'),
                        ('duplicates', 'Duplicates'),
                        ('duplicated_by', 'Duplicated By'),
                    ],
                    default='related',
                    max_length=20,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('from_ticket', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='outgoing_relations', to='tickets.ticket')),
                ('to_ticket', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='incoming_relations', to='tickets.ticket')),
            ],
            options={
                'db_table': 'ticket_relations',
                'ordering': ['created_at'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='ticketrelation',
            unique_together={('from_ticket', 'to_ticket', 'relation_type')},
        ),
    ]
