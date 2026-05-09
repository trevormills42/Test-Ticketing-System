import { Link, useLocation } from 'react-router';
import { LayoutDashboard, Inbox, MessageSquare, Settings, Ticket, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/tickets', label: 'Tickets', icon: Inbox },
  { path: '/canned-responses', label: 'Canned Responses', icon: MessageSquare },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-[#1a2332] flex flex-col transition-all duration-300 z-50',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Ticket className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-white font-semibold text-base tracking-tight">
            HelpDesk Pro
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors relative',
                isActive
                  ? 'text-white bg-[#2d3f56]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#243447]'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500" />
              )}
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mx-auto mb-4 p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* User info */}
      {!collapsed && (
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center">
              <span className="text-blue-400 text-xs font-semibold">SC</span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">Sarah Chen</p>
              <p className="text-slate-500 text-xs">IT Support Agent</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
