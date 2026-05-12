# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack helpdesk ticketing system called **HelpDesk Pro**. The React frontend (`app/`) communicates with a Django REST API backend (`app/backend/`) over HTTP.

## Commands

All frontend commands run from `app/`:
```bash
npm run dev       # Start Vite dev server on port 3000
npm run build     # TypeScript compile + Vite build
npm run lint      # ESLint
```

All backend commands run from `app/backend/`:
```bash
python3 manage.py runserver 0.0.0.0:8000   # Start API server on port 8000
python3 manage.py migrate                   # Apply migrations
python3 manage.py test                      # Run Django tests
python3 manage.py test api                  # Run tests for a single app
```

Or use the helper script from `app/`:
```bash
bash start-backend.sh   # Starts backend; default login admin / admin123
```

Seed the database with sample data (run from `app/backend/`):
```bash
python3 seed_data.py   # Wipes all non-superuser data and recreates it
```

## Architecture

### Frontend (`app/src/`)

- **`lib/api.ts`** — single source of truth for all API calls and TypeScript types. All interfaces (`Ticket`, `Agent`, `SLAConfig`, etc.) and every `axios` call live here. The base URL is hardcoded to `http://localhost:8000/api`.
- **`providers/QueryProvider.tsx`** — wraps the app in `@tanstack/react-query`. All data fetching uses React Query hooks calling the functions from `lib/api.ts`.
- **`pages/`** — one file per route (`Dashboard`, `Tickets`, `TicketDetail`, `NewTicket`, `CannedResponses`, `Settings`). Routes are defined in `App.tsx` with a persistent `Sidebar` layout.
- **`components/ui/`** — shadcn/ui component library (40+ components). Import with `@/components/ui/<name>`. Do not edit these files; they are the design system foundation.
- **`components/shared/Badges.tsx`** — reusable status/priority badge components used across pages.
- Path alias `@` maps to `src/`.

### Backend (`app/backend/`)

There are two Django apps with a deliberate split of responsibility:
- **`tickets/`** — owns all data models: `Ticket`, `TicketComment`, `TicketActivity`, `Agent`, `SLAConfig`, `CannedResponse`. No views.
- **`api/`** — owns all views, serializers, and URL routing. Imports models from `tickets`.

**URL structure** (all under `/api/`):
- `tickets/` and `tickets/<uuid:id>/`
- `tickets/<uuid:ticket_id>/comments/`
- `agents/` and `agents/<uuid:id>/`
- `canned-responses/` and `canned-responses/<uuid:id>/`
- `sla-configs/` and `sla-configs/<uuid:id>/`
- `users/`
- `dashboard/stats/`, `dashboard/by-status/`, `dashboard/by-priority/`, `dashboard/trend/`, `dashboard/agent-performance/`, `dashboard/resolution-by-priority/`

**Key serializer pattern**: `Ticket` has three serializers — `TicketListSerializer` (lightweight, for list view), `TicketDetailSerializer` (full nested data including comments/activities, with writable `assigned_to_id`), and `TicketCreateSerializer`. `TicketListCreateView.get_serializer_class()` switches between them by HTTP method.

**Automatic side effects** in views:
- `Ticket.save()` auto-generates `ticket_number` as `TKT-XXXXX` on first save.
- `TicketDetailView.perform_update()` creates `TicketActivity` records when `status` or `assigned_to` changes.
- `TicketCommentListCreateView.perform_create()` sets `first_responded_at` on the ticket if it hasn't been set.

**Django settings**: SQLite database (`db.sqlite3` in `app/backend/`), `CORS_ALLOW_ALL_ORIGINS = True`, `AllowAny` DRF permission class, `PageNumberPagination` with `PAGE_SIZE = 20`.

### Data Model Relationships

```
User (Django built-in)
  └── Agent (OneToOne) — role: admin | agent | viewer

Ticket
  ├── assigned_to → Agent (nullable FK)
  ├── created_by → User (nullable FK)
  ├── sla_config → SLAConfig (nullable FK)
  ├── comments → TicketComment[]
  └── activities → TicketActivity[]

SLAConfig — one per priority level (low/medium/high/critical)
CannedResponse — pre-written reply templates with category grouping
```

Ticket status values: `open | in_progress | pending | resolved | closed`  
Ticket priority values: `low | medium | high | critical`  
Ticket type values: `incident | service_request | problem | change`
