import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Users, Sliders, Info, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { getSLAConfigs, getAgents } from '@/lib/api';
import { cn } from '@/lib/utils';

type SettingsTab = 'sla' | 'agents' | 'general';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('sla');

  const { data: slaConfigs } = useQuery({
    queryKey: ['sla-configs'],
    queryFn: getSLAConfigs,
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
  });

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'sla', label: 'SLA Configuration', icon: Clock },
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'general', label: 'General', icon: Sliders },
  ];

  return (
    <div className="p-6 space-y-5">
      <Header />

      <div className="flex gap-5">
        {/* Left Tabs */}
        <div className="w-56 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <tab.icon className={cn('w-4 h-4', activeTab === tab.id ? 'text-blue-600' : 'text-slate-400')} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'sla' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>Changes to SLA configuration apply to new tickets only. Existing tickets retain their current SLA settings.</span>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">SLA Policies by Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left py-3 px-4 font-medium text-slate-500">Priority</th>
                          <th className="text-center py-3 px-4 font-medium text-slate-500">Response Time</th>
                          <th className="text-center py-3 px-4 font-medium text-slate-500">Resolution Time</th>
                          <th className="text-center py-3 px-4 font-medium text-slate-500">Warning Threshold</th>
                          <th className="text-center py-3 px-4 font-medium text-slate-500">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slaConfigs?.map((config) => (
                          <tr key={config.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="py-3 px-4">
                              <span className={cn(
                                'px-2.5 py-1 rounded-full text-xs font-medium capitalize',
                                config.priority === 'critical' && 'bg-red-100 text-red-700',
                                config.priority === 'high' && 'bg-orange-100 text-orange-700',
                                config.priority === 'medium' && 'bg-amber-100 text-amber-700',
                                config.priority === 'low' && 'bg-slate-100 text-slate-600',
                              )}>
                                {config.priority}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-700">
                              {config.response_time_minutes < 60
                                ? `${config.response_time_minutes} min`
                                : `${Math.round(config.response_time_minutes / 60)} hours`}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-700">
                              {config.resolution_time_minutes < 60
                                ? `${config.resolution_time_minutes} min`
                                : `${Math.round(config.resolution_time_minutes / 60)} hours`}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-700">
                              {config.warning_threshold_percent}%
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={cn(
                                'inline-flex items-center gap-1 text-xs font-medium',
                                config.is_active ? 'text-emerald-600' : 'text-slate-400'
                              )}>
                                {config.is_active ? (
                                  <><ShieldCheck className="w-3.5 h-3.5" /> Active</>
                                ) : (
                                  'Inactive'
                                )}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {(!slaConfigs || slaConfigs.length === 0) && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">
                              No SLA configurations found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">SLA Response Time Reference</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {slaConfigs?.map((config) => (
                      <div key={config.id} className="p-4 rounded-lg border border-slate-100">
                        <p className={cn(
                          'text-xs font-semibold uppercase tracking-wide mb-2',
                          config.priority === 'critical' && 'text-red-600',
                          config.priority === 'high' && 'text-orange-600',
                          config.priority === 'medium' && 'text-amber-600',
                          config.priority === 'low' && 'text-slate-500',
                        )}>
                          {config.priority}
                        </p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Response</span>
                            <span className="font-medium text-slate-700">
                              {config.response_time_minutes < 60
                                ? `${config.response_time_minutes}m`
                                : `${Math.round(config.response_time_minutes / 60)}h`}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Resolution</span>
                            <span className="font-medium text-slate-700">
                              {config.resolution_time_minutes < 60
                                ? `${config.resolution_time_minutes}m`
                                : `${Math.round(config.resolution_time_minutes / 60)}h`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'agents' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Agent Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-3 px-4 font-medium text-slate-500">Agent</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500">Role</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500">Department</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500">Phone</th>
                        <th className="text-center py-3 px-4 font-medium text-slate-500">Tickets</th>
                        <th className="text-center py-3 px-4 font-medium text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents?.map((agent) => (
                        <tr key={agent.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-xs font-semibold text-blue-700">
                                  {(agent.user.full_name || agent.user.username).charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">{agent.user.full_name || agent.user.username}</p>
                                <p className="text-xs text-slate-400">{agent.user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                              agent.role === 'admin' && 'bg-purple-100 text-purple-700',
                              agent.role === 'agent' && 'bg-blue-100 text-blue-700',
                              agent.role === 'viewer' && 'bg-slate-100 text-slate-600',
                            )}>
                              {agent.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{agent.department || '—'}</td>
                          <td className="py-3 px-4 text-slate-600">{agent.phone || '—'}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="text-sm">
                              <span className="font-medium text-slate-700">{agent.open_ticket_count || 0}</span>
                              <span className="text-slate-400"> / {agent.ticket_count || 0}</span>
                            </div>
                            <p className="text-[10px] text-slate-400">open / total</p>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {agent.is_active ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                <UserCheck className="w-3.5 h-3.5" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                <UserX className="w-3.5 h-3.5" />
                                Inactive
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(!agents || agents.length === 0) && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No agents found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'general' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">General Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">System Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-3 rounded-lg bg-slate-50">
                        <p className="text-slate-500">Application</p>
                        <p className="font-medium text-slate-800">HelpDesk Pro</p>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50">
                        <p className="text-slate-500">Version</p>
                        <p className="font-medium text-slate-800">1.0.0</p>
                      </div>
                    </div>
                  </div>
                  <div className="h-px bg-slate-100" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Features</h3>
                    <div className="space-y-2">
                      {[
                        { label: 'Ticket Management', status: 'Enabled' },
                        { label: 'SLA Tracking', status: 'Enabled' },
                        { label: 'Canned Responses', status: 'Enabled' },
                        { label: 'Agent Assignment', status: 'Enabled' },
                        { label: 'Activity Logging', status: 'Enabled' },
                        { label: 'Resolution Analytics', status: 'Enabled' },
                      ].map((feature) => (
                        <div key={feature.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                          <span className="text-sm text-slate-600">{feature.label}</span>
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {feature.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
