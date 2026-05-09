import { useQuery } from '@tanstack/react-query';
import { Inbox, FolderOpen, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardStats, getTicketsByStatus, getTicketsByPriority, getTicketsTrend, getAgentPerformance, getTickets } from '@/lib/api';
import { StatusBadge, PriorityBadge, SLAIndicator } from '@/components/shared/Badges';
import { Link } from 'react-router';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line
} from 'recharts';
import { Header } from '@/components/layout/Header';

const PRIORITY_COLORS = { low: '#94a3b8', medium: '#d97706', high: '#dc2626', critical: '#991b1b' };
const STATUS_COLORS: Record<string, string> = {
  open: '#0891b2',
  in_progress: '#2563eb',
  pending: '#d97706',
  resolved: '#059669',
  closed: '#94a3b8',
};

const statusLabels: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  pending: 'Pending',
  resolved: 'Resolved',
  closed: 'Closed',
};

const priorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  });

  const { data: byStatus } = useQuery({
    queryKey: ['by-status'],
    queryFn: getTicketsByStatus,
  });

  const { data: byPriority } = useQuery({
    queryKey: ['by-priority'],
    queryFn: getTicketsByPriority,
  });

  const { data: trend } = useQuery({
    queryKey: ['trend'],
    queryFn: () => getTicketsTrend(14),
  });

  const { data: agentPerf } = useQuery({
    queryKey: ['agent-performance'],
    queryFn: getAgentPerformance,
  });

  const { data: recentTickets } = useQuery({
    queryKey: ['recent-tickets'],
    queryFn: () => getTickets({ ordering: '-created_at', page: '1' }),
  });

  const formattedStatusData = byStatus?.map((item) => ({
    name: statusLabels[item.status] || item.status,
    value: item.count,
    color: STATUS_COLORS[item.status] || '#94a3b8',
  })) || [];

  const formattedPriorityData = byPriority?.map((item) => ({
    name: priorityLabels[item.priority] || item.priority,
    value: item.count,
    fill: PRIORITY_COLORS[item.priority as keyof typeof PRIORITY_COLORS] || '#94a3b8',
  })) || [];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="p-6 space-y-6">
      <Header />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          label="Total Tickets"
          value={stats?.total_tickets || 0}
          icon={Inbox}
          iconColor="text-blue-500"
          iconBg="bg-blue-50"
        />
        <MetricCard
          label="Open Tickets"
          value={stats?.open_tickets || 0}
          icon={FolderOpen}
          iconColor="text-cyan-500"
          iconBg="bg-cyan-50"
        />
        <MetricCard
          label="SLA Breached"
          value={stats?.sla_breached_count || 0}
          icon={AlertTriangle}
          iconColor="text-red-500"
          iconBg="bg-red-50"
          accent={stats?.sla_breached_count ? 'border-red-200' : ''}
        />
        <MetricCard
          label="Avg Resolution"
          value={`${stats?.avg_resolution_hours || 0}h`}
          icon={Clock}
          iconColor="text-amber-500"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Tickets by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {formattedStatusData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value, 'Tickets']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend
                    formatter={(value: string) => <span className="text-xs text-slate-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Tickets by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedPriorityData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Tickets" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Ticket Trend (Last 14 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  formatter={(value: number) => [value, 'Tickets Created']}
                  labelFormatter={(label: string) => formatDate(label)}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: '#2563eb', r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Tickets"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Agent Performance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Agent Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-3 font-medium text-slate-500">Agent</th>
                  <th className="text-center py-3 px-3 font-medium text-slate-500">Total Assigned</th>
                  <th className="text-center py-3 px-3 font-medium text-slate-500">Resolved</th>
                  <th className="text-center py-3 px-3 font-medium text-slate-500">Open</th>
                  <th className="text-center py-3 px-3 font-medium text-slate-500">Avg Resolution</th>
                </tr>
              </thead>
              <tbody>
                {agentPerf?.map((agent) => (
                  <tr key={agent.agent_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-800">{agent.agent_name}</td>
                    <td className="py-3 px-3 text-center text-slate-600">{agent.total_assigned}</td>
                    <td className="py-3 px-3 text-center text-emerald-600 font-medium">{agent.resolved}</td>
                    <td className="py-3 px-3 text-center text-slate-600">{agent.open_tickets}</td>
                    <td className="py-3 px-3 text-center text-slate-600">{agent.avg_resolution_hours}h</td>
                  </tr>
                ))}
                {(!agentPerf || agentPerf.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">No agent data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Tickets */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-700">Recent Tickets</CardTitle>
          <Link to="/tickets" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            View All
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-3 font-medium text-slate-500">Ticket #</th>
                  <th className="text-left py-3 px-3 font-medium text-slate-500">Title</th>
                  <th className="text-left py-3 px-3 font-medium text-slate-500">Requester</th>
                  <th className="text-center py-3 px-3 font-medium text-slate-500">Status</th>
                  <th className="text-center py-3 px-3 font-medium text-slate-500">Priority</th>
                  <th className="text-left py-3 px-3 font-medium text-slate-500">Assigned</th>
                  <th className="text-center py-3 px-3 font-medium text-slate-500">SLA</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets?.results?.slice(0, 10).map((ticket) => (
                  <tr key={ticket.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3">
                      <Link to={`/tickets/${ticket.id}`} className="text-blue-600 hover:text-blue-700 font-medium">
                        {ticket.ticket_number}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-slate-700 max-w-xs truncate">{ticket.title}</td>
                    <td className="py-3 px-3 text-slate-600">{ticket.requester_name}</td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td className="py-3 px-3 text-slate-600">{ticket.assigned_to_name || '—'}</td>
                    <td className="py-3 px-3">
                      <SLAIndicator status={ticket.sla_status || 'ok'} deadline={ticket.sla_deadline} />
                    </td>
                  </tr>
                ))}
                {(!recentTickets?.results || recentTickets.results.length === 0) && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">No tickets found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  accent?: string;
}) {
  return (
    <Card className={accent ? `border ${accent}` : ''}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
