import { Search, Bell, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useLocation } from 'react-router';
import { useState } from 'react';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/tickets': 'Tickets',
  '/tickets/new': 'New Ticket',
  '/canned-responses': 'Canned Responses',
  '/settings': 'Settings',
};

interface HeaderProps {
  onSearch?: (query: string) => void;
  searchValue?: string;
}

export function Header({ onSearch, searchValue = '' }: HeaderProps) {
  const location = useLocation();
  const [search, setSearch] = useState(searchValue);

  const pathParts = location.pathname.split('/').filter(Boolean);
  const isTicketDetail = pathParts.length === 2 && pathParts[0] === 'tickets';

  let title = pageTitles[location.pathname] || 'HelpDesk';
  if (isTicketDetail) title = 'Ticket Detail';

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    onSearch?.(value);
  };

  return (
    <header className="fixed top-0 right-0 left-60 h-[60px] bg-white border-b border-slate-200 flex items-center justify-between px-6 z-40">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
          {pathParts.map((part, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-slate-400">/</span>
              <span className={i === pathParts.length - 1 ? 'text-slate-700 font-medium' : ''}>
                {part === 'tickets' ? 'Tickets' : part === 'new' ? 'New' : part === 'canned-responses' ? 'Canned Responses' : part === 'settings' ? 'Settings' : part}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search tickets..."
              value={search}
              onChange={handleSearch}
              className="w-72 pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>
        )}

        <button className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <Link to="/tickets/new">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
            <Plus className="w-4 h-4" />
            New Ticket
          </Button>
        </Link>
      </div>
    </header>
  );
}
