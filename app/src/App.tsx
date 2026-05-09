import { Routes, Route } from 'react-router';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toaster } from '@/components/ui/sonner';
import Dashboard from '@/pages/Dashboard';
import Tickets from '@/pages/Tickets';
import TicketDetail from '@/pages/TicketDetail';
import NewTicket from '@/pages/NewTicket';
import CannedResponses from '@/pages/CannedResponses';
import Settings from '@/pages/Settings';

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Sidebar />
      <main className="ml-60 pt-0 min-h-screen">
        {children}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/tickets/new" element={<NewTicket />} />
        <Route path="/tickets/:id" element={<TicketDetail />} />
        <Route path="/canned-responses" element={<CannedResponses />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AppLayout>
  );
}
