import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { ArrowLeft, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createTicket, getAgents } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function NewTicket() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    ticket_type: 'incident',
    requester_name: '',
    requester_email: '',
    requester_phone: '',
    assigned_to_id: '',
    tags: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
  });

  const createMutation = useMutation({
    mutationFn: createTicket,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Ticket created successfully');
      navigate(`/tickets/${data.id}`);
    },
    onError: () => {
      toast.error('Failed to create ticket');
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.requester_name.trim()) newErrors.requester_name = 'Requester name is required';
    if (!formData.requester_email.trim()) newErrors.requester_email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.requester_email)) newErrors.requester_email = 'Invalid email';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    const data: Record<string, unknown> = {
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      ticket_type: formData.ticket_type,
      requester_name: formData.requester_name,
      requester_email: formData.requester_email,
      requester_phone: formData.requester_phone || undefined,
      source: 'web',
    };
    
    if (formData.assigned_to_id) {
      data.assigned_to_id = formData.assigned_to_id;
    }
    
    if (formData.tags.trim()) {
      data.tags = formData.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
    
    createMutation.mutate(data);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/tickets')}
          className="gap-1 text-slate-500"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <h1 className="text-xl font-bold text-slate-900">Create New Ticket</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ticket Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Brief description of the issue"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                className={errors.title ? 'border-red-300' : ''}
              />
              {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Detailed description of the issue or request"
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={6}
                className={errors.description ? 'border-red-300 resize-none' : 'resize-none'}
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
            </div>

            {/* Priority & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => updateField('priority', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ticket_type">Type</Label>
                <Select value={formData.ticket_type} onValueChange={(v) => updateField('ticket_type', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incident">Incident</SelectItem>
                    <SelectItem value="service_request">Service Request</SelectItem>
                    <SelectItem value="problem">Problem</SelectItem>
                    <SelectItem value="change">Change</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Requester Info */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Requester Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="requester_name">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="requester_name"
                    placeholder="Full name"
                    value={formData.requester_name}
                    onChange={(e) => updateField('requester_name', e.target.value)}
                    className={errors.requester_name ? 'border-red-300' : ''}
                  />
                  {errors.requester_name && <p className="text-xs text-red-500">{errors.requester_name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="requester_email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="requester_email"
                    type="email"
                    placeholder="email@company.com"
                    value={formData.requester_email}
                    onChange={(e) => updateField('requester_email', e.target.value)}
                    className={errors.requester_email ? 'border-red-300' : ''}
                  />
                  {errors.requester_email && <p className="text-xs text-red-500">{errors.requester_email}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="requester_phone">Phone</Label>
                  <Input
                    id="requester_phone"
                    placeholder="+1 (555) 000-0000"
                    value={formData.requester_phone}
                    onChange={(e) => updateField('requester_phone', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="assigned_to">Assign To</Label>
                  <Select value={formData.assigned_to_id} onValueChange={(v) => updateField('assigned_to_id', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— Unassigned —</SelectItem>
                      {agents?.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.user.full_name || agent.user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="urgent, follow-up, external (comma separated)"
                value={formData.tags}
                onChange={(e) => updateField('tags', e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/tickets')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {createMutation.isPending ? 'Creating...' : 'Create Ticket'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
