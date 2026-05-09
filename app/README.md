# HelpDesk Pro

A professional helpdesk ticketing system built with Django REST Framework backend and React/Vite frontend.

## Features

- **Ticket Management**: Create, view, update, and manage support tickets
- **Agent Assignment**: Assign tickets to agents with role-based access
- **Priority Levels**: Low, Medium, High, Critical priorities with color-coded badges
- **SLA Tracking**: Automatic SLA deadline calculation with breach and warning indicators
- **Canned Responses**: Pre-defined response templates for quick replies
- **Resolution Analytics**: Dashboard with charts for ticket trends, agent performance, and SLA metrics
- **Activity Logging**: Track all changes to tickets with full audit trail
- **Comments & Internal Notes**: Add public and internal comments to tickets

## Tech Stack

### Backend
- Django 6.0
- Django REST Framework
- SQLite database (easily switchable to PostgreSQL/MySQL)
- CORS headers enabled

### Frontend
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS
- shadcn/ui components
- Recharts (charts)
- React Query (data fetching)
- React Router (navigation)

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 20+

### 1. Install Backend Dependencies

```bash
pip3 install django django-rest-framework django-cors-headers
```

### 2. Start the Backend

```bash
cd /mnt/agents/output/app
bash start-backend.sh
```

The Django API will be available at `http://localhost:8000/api/`

Admin panel: `http://localhost:8000/admin/`
- Username: `admin`
- Password: `admin123`

### 3. Start the Frontend (Development)

```bash
cd /mnt/agents/output/app
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 4. Seed Data

The database comes pre-seeded with 23 sample tickets, 5 agents, 8 canned responses, and SLA configurations.

To re-seed:
```bash
cd /mnt/agents/output/app/backend
python3 seed_data.py
```

### 5. Build for Production

```bash
cd /mnt/agents/output/app
npm run build
```

Output will be in the `dist/` directory.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/stats/` | GET | Dashboard statistics |
| `/api/dashboard/by-status/` | GET | Ticket counts by status |
| `/api/dashboard/by-priority/` | GET | Ticket counts by priority |
| `/api/dashboard/trend/` | GET | Tickets trend over days |
| `/api/dashboard/agent-performance/` | GET | Agent performance metrics |
| `/api/tickets/` | GET, POST | List/create tickets |
| `/api/tickets/<id>/` | GET, PUT, PATCH | Ticket detail |
| `/api/tickets/<id>/comments/` | GET, POST | Ticket comments |
| `/api/agents/` | GET | List agents |
| `/api/canned-responses/` | GET, POST | List/create canned responses |
| `/api/canned-responses/<id>/` | GET, PUT, DELETE | Canned response detail |
| `/api/sla-configs/` | GET | List SLA configs |

## Project Structure

```
/mnt/agents/output/app/
├── backend/                    # Django backend
│   ├── helpdesk/              # Django project settings
│   ├── tickets/               # Tickets app (models)
│   ├── api/                   # API app (views, serializers, urls)
│   ├── manage.py
│   └── seed_data.py           # Database seed script
├── src/                       # React frontend
│   ├── pages/                 # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Tickets.tsx
│   │   ├── TicketDetail.tsx
│   │   ├── NewTicket.tsx
│   │   ├── CannedResponses.tsx
│   │   └── Settings.tsx
│   ├── components/
│   │   ├── layout/            # Sidebar, Header
│   │   └── shared/            # Badges, Status indicators
│   ├── lib/
│   │   └── api.ts             # API client and types
│   ├── providers/
│   │   └── QueryProvider.tsx  # React Query setup
│   ├── App.tsx
│   └── main.tsx
├── dist/                      # Production build output
└── package.json
```

## Pages

### Dashboard (`/`)
- Summary metrics (total tickets, open, SLA breached, avg resolution)
- Donut chart: Tickets by Status
- Bar chart: Tickets by Priority
- Line chart: Ticket trend (last 14 days)
- Agent performance table
- Recent tickets table

### Tickets List (`/#/tickets`)
- Full ticket table with sorting
- Filter by status, priority, assigned agent, SLA status
- Search across title, ticket number, requester
- Pagination (20 per page)

### Ticket Detail (`/#/tickets/:id`)
- Full ticket information
- Status, priority, assignment controls
- Comments and activity log tabs
- Canned response quick-insert
- SLA panel with deadline tracking

### New Ticket (`/#/tickets/new`)
- Form with validation
- All ticket fields including requester info
- Optional agent assignment

### Canned Responses (`/#/canned-responses`)
- Grid of response cards
- Search and category filter
- Add/edit/delete with dialog modal

### Settings (`/#/settings`)
- SLA Configuration tab
- Agent Management tab
- General system info tab
