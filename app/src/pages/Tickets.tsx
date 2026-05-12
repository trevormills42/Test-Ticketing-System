import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Filter, X, Eye, MoreHorizontal, Inbox, ChevronUp, ChevronDown, ChevronsUpDown, CheckSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getTickets, getAgents, bulkUpdateTickets } from '@/lib/api';
import { StatusBadge, PriorityBadge, SLAIndicator } from '@/components/shared/Badges';
import { Header } from '@/components/layout/Header';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const slaOptions = [
  { value: '', label: 'All SLA' },
  { value: 'breached', label: 'Breached' },
  { value: 'warning', label: 'Warning' },
  { value: 'ok', label: 'On Track' },
];

type SortField = 'created_at' | 'updated_at' | 'priority' | 'status' | 'ticket_number';

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: 'asc' | 'desc' }) {
  if (field !== current) return <ChevronsUpDown className="w-3 h-3 text-slate-300 inline ml-1" />;
  return dir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-blue-500 inline ml-1" />
    : <ChevronDown className="w-3 h-3 text-blue-500 inline ml-1" />;
}

export default function Tickets() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [assignedFilter, setAssignedFilter] = useState('');
  const [slaFilter, setSlaFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkPriority, setBulkPriority] = useState('');

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
  });

  const buildParams = useCallback(() => {
    const params: Record<string, string> = {
      page: String(page),
      ordering: `${sortDir === 'desc' ? '-' : ''}${sortField}`,
    };
    if (search) params.search = search;
    if (statusFilter.length) params.status = statusFilter.join(',');
    if (priorityFilter.length) params.priority = priorityFilter.join(',');
    if (assignedFilter) params.assigned_to = assignedFilter;
    if (slaFilter) params.sla_status = slaFilter;
    return params;
  }, [search, statusFilter, priorityFilter, assignedFilter, slaFilter, page, sortField, sortDir]);

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', buildParams()],
    queryFn: () => getTickets(buildParams()),
  });

  const bulkMutation = useMutation({
    mutationFn: bulkUpdateTickets,
    onSuccess: (result) => {
      toast.success(`Updated ${result.updated} ticket${result.updated !== 1 ? 's' : ''}`);
      setSelectedIds(new Set());
      setBulkStatus('');
      setBulkPriority('');
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: () => toast.error('Bulk update failed'),
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(1);
  };

  const toggleStatus = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
    setPage(1);
  };

  const togglePriority = (priority: string) => {
    setPriorityFilter((prev) =>
      prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter([]);
    setPriorityFilter([]);
    setAssignedFilter('');
    setSlaFilter('');
    setPage(1);
  };

  const allIds = data?.results?.map((t) => t.id) ?? [];
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyBulkAction = () => {
    if (!bulkStatus && !bulkPriority) {
      toast.error('Choose a status or priority to apply');
      return;
    }
    const payload: Parameters<typeof bulkUpdateTickets>[0] = { ids: Array.from(selectedIds) };
    if (bulkStatus) payload.status = bulkStatus;
    if (bulkPriority) payload.priority = bulkPriority;
    bulkMutation.mutate(payload);
  };

  const hasFilters = search || statusFilter.length || priorityFilter.length || assignedFilter || slaFilter;
  const totalPages = data ? Math.ceil(data.count / 20) : 0;

  const SortTh = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="text-left py-3 px-4 font-medium text-slate-500 cursor-pointer select-none hover:text-slate-700"
      onClick={() => toggleSort(field)}
    >
      {label}
      <SortIcon field={field} current={sortField} dir={sortDir} />
    </th>
  );

  return (
    <div className="p-6 space-y-5">
      <Header onSearch={setSearch} searchValue={search} />

      {/* Bulk Action Toolbar */}
      {someSelected && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-blue-700">
                <CheckSquare className="w-4 h-4 inline mr-1" />
                {selectedIds.size} selected
              </span>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="h-8 px-2 text-xs rounded border border-blue-200 bg-white text-slate-600 focus:outline-none"
              >
                <option value="">Set Status...</option>
                {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select
                value={bulkPriority}
                onChange={(e) => setBulkPriority(e.target.value)}
                className="h-8 px-2 text-xs rounded border border-blue-200 bg-white text-slate-600 focus:outline-none"
              >
                <option value="">Set Priority...</option>
                {priorityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={applyBulkAction}
                disabled={bulkMutation.isPending}
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-slate-500"
                onClick={() => { setSelectedIds(new Set()); setBulkStatus(''); setBulkPriority(''); }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-500 font-medium">Status:</span>
              <div className="flex gap-1">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => toggleStatus(opt.value)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      statusFilter.includes(opt.value)
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 font-medium">Priority:</span>
              <div className="flex gap-1">
                {priorityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => togglePriority(opt.value)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      priorityFilter.includes(opt.value)
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <select
              value={assignedFilter}
              onChange={(e) => { setAssignedFilter(e.target.value); setPage(1); }}
              className="h-8 px-2.5 text-xs rounded-md border border-slate-200 bg-white text-slate-600 focus:outline-none"
            >
              <option value="">All Agents</option>
              {agents?.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.user.full_name || agent.user.username}
                </option>
              ))}
            </select>

            <select
              value={slaFilter}
              onChange={(e) => { setSlaFilter(e.target.value); setPage(1); }}
              className="h-8 px-2.5 text-xs rounded-md border border-slate-200 bg-white text-slate-600 focus:outline-none"
            >
              {slaOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-slate-500 hover:text-red-600 gap-1">
                <X className="w-3.5 h-3.5" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ticket Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 cursor-pointer"
                    />
                  </th>
                  <SortTh field="ticket_number" label="Ticket #" />
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Title</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Requester</th>
                  <SortTh field="status" label="Status" />
                  <SortTh field="priority" label="Priority" />
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Assigned</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-500">SLA</th>
                  <SortTh field="created_at" label="Created" />
                  <th className="py-3 px-4 w-10" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td colSpan={10} className="py-4 px-4">
                        <div className="animate-pulse bg-slate-100 h-4 rounded" />
                      </td>
                    </tr>
                  ))
                ) : data?.results?.length ? (
                  data.results.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${selectedIds.has(ticket.id) ? 'bg-blue-50/40' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(ticket.id)}
                          onChange={() => toggleSelectOne(ticket.id)}
                          className="rounded border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Link to={`/tickets/${ticket.id}`} className="text-blue-600 hover:text-blue-700 font-semibold text-xs">
                          {ticket.ticket_number}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{ticket.title}</td>
                      <td className="py-3 px-4 text-slate-600">{ticket.requester_name}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="py-3 px-4">
                        <PriorityBadge priority={ticket.priority} />
                      </td>
                      <td className="py-3 px-4 text-slate-600">{ticket.assigned_to_name || '—'}</td>
                      <td className="py-3 px-4">
                        <SLAIndicator status={ticket.sla_status || 'ok'} deadline={ticket.sla_deadline} />
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded hover:bg-slate-100 transition-colors">
                              <MoreHorizontal className="w-4 h-4 text-slate-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem asChild>
                              <Link to={`/tickets/${ticket.id}`} className="flex items-center gap-2 cursor-pointer">
                                <Eye className="w-3.5 h-3.5" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Inbox className="w-10 h-10 text-slate-300" />
                        <p className="text-slate-500 font-medium">No tickets found</p>
                        {hasFilters && (
                          <Button variant="outline" size="sm" onClick={clearFilters}>
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data?.count || 0)} of {data?.count} tickets
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-7 px-2 text-xs">
                  Previous
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button key={pageNum} variant={pageNum === page ? 'default' : 'outline'} size="sm" onClick={() => setPage(pageNum)} className="h-7 w-7 text-xs p-0">
                      {pageNum}
                    </Button>
                  );
                })}
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-7 px-2 text-xs">
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
