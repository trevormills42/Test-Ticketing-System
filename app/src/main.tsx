import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import * as Sentry from '@sentry/react';
import { QueryProvider } from '@/providers/QueryProvider';
import './index.css';
import App from './App.tsx';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: false,
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <QueryProvider>
        <App />
      </QueryProvider>
    </HashRouter>
  </StrictMode>,
);
