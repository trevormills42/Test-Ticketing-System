import { Routes, Route } from 'react-router';
import { ErrorBoundary } from '@sentry/react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toaster } from '@/components/ui/sonner';
import Dashboard from '@/pages/Dashboard';
import Tickets from '@/pages/Tickets';
import TicketDetail from '@/pages/TicketDetail';
import NewTicket from '@/pages/NewTicket';
import CannedResponses from '@/pages/CannedResponses';
import Settings from '@/pages/Settings';
import StatusPortal from '@/pages/StatusPortal';

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

function ErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-3">
        <h2 className="text-xl font-semibold text-slate-800">Something went wrong</h2>
        <p className="text-slate-500 text-sm">An unexpected error occurred. Please refresh the page.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          Reload
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Routes>
        {/* Public status portal — no sidebar */}
        <Route path="/status" element={<StatusPortal />} />
        <Route path="/status/:ticketNumber" element={<StatusPortal />} />

        {/* Main app with sidebar */}
        <Route
          path="/*"
          element={
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
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}
