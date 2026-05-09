import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router';
import {
  ArrowLeft, Send, MessageSquare, History, User, Mail, Phone,
  CheckCircle2, AlertTriangle, XCircle, Tag
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getTicket, getAgents, getCannedResponses, updateTicket, addTicketComment } from '@/lib/api';
import { StatusBadge, PriorityBadge } from '@/components/shared/Badges';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => getTicket(id!),
    enabled: !!id,
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
  });

  const { data: cannedResponses } = useQuery({
    queryKey: ['canned-responses'],
    queryFn: () => getCannedResponses({ active_only: 'true' }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => updateTicket(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Ticket updated');
    },
  });

  const commentMutation = useMutation({
    mutationFn: (data: { content: string; is_internal: boolean; author_name: string }) =>
      addTicketComment(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setCommentText('');
      setIsInternal(false);
      toast.success('Comment added');
    },
  });

  const handleStatusChange = (status: string) => {
    const updates: Record<string, unknown> = { status };
    if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    }
    updateMutation.mutate(updates);
  };

  const handleAssign = (agentId: string) => {
    if (agentId === 'unassigned') {
      updateMutation.mutate({ assigned_to_id: null });
    } else {
      updateMutation.mutate({ assigned_to_id: agentId });
    }
  };

  const handlePriorityChange = (priority: string) => {
    updateMutation.mutate({ priority });
  };

  const handlePostComment = () => {
    if (!commentText.trim()) return;
    commentMutation.mutate({
      content: commentText.trim(),
      is_internal: isInternal,
      author_name: 'Sarah Chen',
    });
  };

  const handleInsertCanned = (content: string) => {
    setCommentText((prev) => prev + (prev ? '\n\n' : '') + content);
  };

  const getSLAColor = () => {
    if (ticket?.sla_breached) return 'border-l-red-500';
    if (ticket?.sla_warning) return 'border-l-amber-500';
    return 'border-l-emerald-500';
  };

  const getSLAIcon = () => {
    if (ticket?.sla_breached) return <XCircle className="w-5 h-5 text-red-500" />;
    if (ticket?.sla_warning) return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
  };

  const getSLALabel = () => {
    if (ticket?.sla_breached) return 'SLA Breached';
    if (ticket?.sla_warning) return 'SLA Warning';
    return 'SLA On Track';
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-100 rounded w-1/3" />
          <div className="h-32 bg-slate-100 rounded" />
          <div className="h-64 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Ticket not found</p>
        <Link to="/tickets" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          Back to tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Back + Ticket Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/tickets')}
          className="gap-1 text-slate-500"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="h-4 w-px bg-slate-200" />
        <span className="text-sm text-slate-500 font-medium">{ticket.ticket_number}</span>
        <StatusBadge status={ticket.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left Column - 65% */}
        <div className="lg:col-span-3 space-y-5">
          {/* Title Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-slate-900 mb-2">{ticket.title}</h1>
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={ticket.priority} />
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium capitalize">
                      {ticket.ticket_type?.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400">
                      Created {new Date(ticket.created_at).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      onClick={() => handleStatusChange('resolved')}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Resolve
                    </Button>
                  )}
                  {ticket.status === 'resolved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange('closed')}
                    >
                      Close Ticket
                    </Button>
                  )}
                  {ticket.status === 'open' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange('in_progress')}
                    >
                      Start Work
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Description</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
              <div className="mt-4 p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{ticket.requester_name}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{ticket.requester_email}</span>
                    {ticket.requester_phone && (
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{ticket.requester_phone}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments & Activity */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
                    activeTab === 'comments'
                      ? 'text-blue-600 border-blue-600'
                      : 'text-slate-500 border-transparent hover:text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" />
                    Comments ({ticket.comments?.length || 0})
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
                    activeTab === 'activity'
                      ? 'text-blue-600 border-blue-600'
                      : 'text-slate-500 border-transparent hover:text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <History className="w-4 h-4" />
                    Activity ({ticket.activities?.length || 0})
                  </span>
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {activeTab === 'comments' ? (
                <div className="space-y-4">
                  {/* Comment list */}
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {ticket.comments?.map((comment) => (
                      <div
                        key={comment.id}
                        className={`p-3 rounded-lg ${
                          comment.is_internal ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-700">
                                {comment.author_name?.charAt(0)}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-slate-700">{comment.author_name}</span>
                            {comment.is_internal && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 text-[10px] font-medium">
                                Internal
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(comment.created_at).toLocaleString('en-US', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap pl-8">{comment.content}</p>
                      </div>
                    ))}
                    {(!ticket.comments || ticket.comments.length === 0) && (
                      <p className="text-sm text-slate-400 text-center py-6">No comments yet</p>
                    )}
                  </div>

                  {/* New comment */}
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    {cannedResponses && cannedResponses.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs text-slate-500 self-center mr-1">Insert:</span>
                        {cannedResponses.slice(0, 5).map((cr) => (
                          <button
                            key={cr.id}
                            onClick={() => handleInsertCanned(cr.content)}
                            className="px-2 py-1 rounded bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors"
                            title={cr.title}
                          >
                            {cr.title.length > 20 ? cr.title.substring(0, 20) + '...' : cr.title}
                          </button>
                        ))}
                      </div>
                    )}
                    <Textarea
                      placeholder="Write a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        <span>Internal note (not visible to requester)</span>
                      </label>
                      <Button
                        size="sm"
                        onClick={handlePostComment}
                        disabled={!commentText.trim() || commentMutation.isPending}
                        className="gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Post Comment
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {ticket.activities?.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                      <History className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700">
                          <span className="font-medium">{activity.actor_name}</span>{' '}
                          changed <span className="font-medium">{activity.field_changed.replace('_', ' ')}</span>
                          {activity.old_value && (
                            <>
                              {' '}from <span className="text-slate-500">"{activity.old_value}"</span>
                            </>
                          )}
                          {' '}to <span className="text-blue-600">"{activity.new_value}"</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(activity.created_at).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!ticket.activities || ticket.activities.length === 0) && (
                    <p className="text-sm text-slate-400 text-center py-6">No activity yet</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - 35% */}
        <div className="lg:col-span-2 space-y-5">
          {/* SLA Panel */}
          <Card className={`border-l-4 ${getSLAColor()}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {getSLAIcon()}
                <CardTitle className="text-sm font-semibold text-slate-700">{getSLALabel()}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {ticket.sla_deadline && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Deadline</span>
                  <span className="font-medium text-slate-700">
                    {new Date(ticket.sla_deadline).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
              {ticket.first_responded_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">First Response</span>
                  <span className="font-medium text-emerald-600">
                    {new Date(ticket.first_responded_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
              {ticket.resolved_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Resolved</span>
                  <span className="font-medium text-emerald-600">
                    {new Date(ticket.resolved_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
              {ticket.sla_config && (
                <>
                  <div className="h-px bg-slate-100" />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Response target: {ticket.sla_config.response_time_minutes}min</span>
                    <span>Resolution target: {ticket.sla_config.resolution_time_minutes}min</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Status</label>
                <Select value={ticket.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assigned To */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Assigned To</label>
                <Select
                  value={ticket.assigned_to?.id || 'unassigned'}
                  onValueChange={handleAssign}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">— Unassigned —</SelectItem>
                    {agents?.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.user.full_name || agent.user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Priority</label>
                <Select value={ticket.priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="h-9 text-sm">
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

              {/* Source */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Source</span>
                <span className="capitalize text-slate-700 font-medium">{ticket.source}</span>
              </div>

              {/* Tags */}
              {ticket.tags && ticket.tags.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Tags</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ticket.tags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="h-px bg-slate-100" />

              {/* Timestamps */}
              <div className="space-y-2 text-xs text-slate-500">
                <div className="flex items-center justify-between">
                  <span>Created</span>
                  <span>{new Date(ticket.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Updated</span>
                  <span>{new Date(ticket.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {ticket.time_to_resolution && (
                  <div className="flex items-center justify-between">
                    <span>Resolution Time</span>
                    <span className="text-emerald-600 font-medium">{ticket.time_to_resolution}h</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
