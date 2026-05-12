import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Search, CheckCircle2, AlertTriangle, XCircle, Clock, MessageSquare } from 'lucide-react';
import { getTicketStatusPortal } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  pending: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-600',
};

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

function SLABadge({ status }: { status: string }) {
  if (status === 'breached') return <span className="flex items-center gap-1 text-red-600 text-sm font-medium"><XCircle className="w-4 h-4" /> SLA Breached</span>;
  if (status === 'warning') return <span className="flex items-center gap-1 text-amber-600 text-sm font-medium"><AlertTriangle className="w-4 h-4" /> SLA Warning</span>;
  return <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium"><CheckCircle2 className="w-4 h-4" /> On Track</span>;
}

function TicketStatusView({ ticketNumber }: { ticketNumber: string }) {
  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ['status-portal', ticketNumber],
    queryFn: () => getTicketStatusPortal(ticketNumber),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-100 rounded w-1/2" />
        <div className="h-32 bg-slate-100 rounded" />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-8 text-center">
          <XCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Ticket not found</p>
          <p className="text-sm text-slate-400 mt-1">Check the ticket number and try again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{ticket.ticket_number}</p>
              <h2 className="text-xl font-bold text-slate-900">{ticket.title}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[ticket.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {ticket.status.replace('_', ' ')}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${priorityColors[ticket.priority] ?? 'bg-slate-100 text-slate-600'}`}>
                {ticket.priority} priority
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-400 mb-1">Type</p>
              <p className="text-sm font-medium text-slate-700 capitalize">{ticket.ticket_type.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Assigned To</p>
              <p className="text-sm font-medium text-slate-700">{ticket.assigned_to_name || 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Opened</p>
              <p className="text-sm font-medium text-slate-700">
                {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Last Updated</p>
              <p className="text-sm font-medium text-slate-700">
                {new Date(ticket.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          {ticket.sla_deadline && (
            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock className="w-4 h-4" />
                Resolution deadline: {new Date(ticket.sla_deadline).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
              <SLABadge status={ticket.sla_status} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Public Comments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4" />
            Updates ({ticket.public_comments?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {ticket.public_comments && ticket.public_comments.length > 0 ? (
            <div className="space-y-3">
              {ticket.public_comments.map((c) => (
                <div key={c.id} className="p-3 rounded-lg bg-slate-50">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700">{c.author_name}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(c.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">No updates yet. Our team is working on your request.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function StatusPortal() {
  const { ticketNumber } = useParams<{ ticketNumber?: string }>();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState(ticketNumber ?? '');

  const handleSearch = () => {
    const trimmed = searchInput.trim().toUpperCase();
    if (!trimmed) return;
    navigate(`/status/${trimmed}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">HelpDesk Pro</h1>
            <p className="text-xs text-slate-400">Ticket Status Portal</p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Search */}
        <div>
          <h2 className="text-xl font-semibold text-slate-800 mb-1">Check Ticket Status</h2>
          <p className="text-sm text-slate-500 mb-4">Enter your ticket number to see the current status and any updates.</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="TKT-00001"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              className="flex-1 h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
            <Button onClick={handleSearch} className="gap-1.5">
              <Search className="w-4 h-4" />
              Look Up
            </Button>
          </div>
        </div>

        {/* Result */}
        {ticketNumber && <TicketStatusView ticketNumber={ticketNumber.toUpperCase()} />}
      </div>

      <div className="text-center py-4 text-xs text-slate-400">
        Powered by HelpDesk Pro
      </div>
    </div>
  );
}
