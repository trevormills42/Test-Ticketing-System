import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import { QueryProvider } from '@/providers/QueryProvider';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <QueryProvider>
        <App />
      </QueryProvider>
    </HashRouter>
  </StrictMode>,
);
