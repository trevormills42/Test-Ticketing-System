import axios from 'axios';

const API_BASE_URL = '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  ticket_type: 'incident' | 'service_request' | 'problem' | 'change';
  requester_name: string;
  requester_email: string;
  requester_phone?: string;
  assigned_to?: Agent | null;
  assigned_to_id?: string | null;
  assigned_to_name?: string;
  sla_config?: SLAConfig;
  sla_deadline?: string;
  sla_breached: boolean;
  sla_warning: boolean;
  first_responded_at?: string;
  resolved_at?: string;
  source: string;
  tags: string[];
  comments?: TicketComment[];
  activities?: TicketActivity[];
  attachments?: TicketAttachment[];
  relations?: { outgoing: TicketRelation[]; incoming: TicketRelation[] };
  comments_count?: number;
  sla_status?: 'ok' | 'warning' | 'breached';
  time_to_resolution?: number;
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  ticket: string;
  author_name: string;
  author_email: string;
  is_internal: boolean;
  content: string;
  created_at: string;
}

export interface TicketActivity {
  id: string;
  ticket: string;
  actor_name: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

export interface TicketAttachment {
  id: string;
  ticket: string;
  filename: string;
  content_type: string;
  size: number;
  uploaded_by: string;
  url: string;
  created_at: string;
}

export interface TicketRelation {
  id: string;
  from_ticket: string;
  from_ticket_number: string;
  to_ticket: string;
  to_ticket_number: string;
  to_ticket_title: string;
  to_ticket_status: string;
  relation_type: 'related' | 'blocks' | 'blocked_by' | 'duplicates' | 'duplicated_by';
  created_at: string;
}

export interface Agent {
  id: string;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
  };
  role: string;
  department: string;
  phone: string;
  is_active: boolean;
  ticket_count?: number;
  open_ticket_count?: number;
}

export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SLAConfig {
  id: string;
  priority: string;
  response_time_minutes: number;
  resolution_time_minutes: number;
  warning_threshold_percent: number;
  is_active: boolean;
}

export interface DashboardStats {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  pending_tickets: number;
  resolved_today: number;
  sla_breached_count: number;
  sla_warning_count: number;
  avg_resolution_hours: number;
}

export interface TicketCountByStatus {
  status: string;
  count: number;
}

export interface TicketCountByPriority {
  priority: string;
  count: number;
}

export interface TrendData {
  date: string;
  count: number;
}

export interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  total_assigned: number;
  resolved: number;
  avg_resolution_hours: number;
  open_tickets: number;
}

export interface PublicTicketStatus {
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  ticket_type: string;
  requester_name: string;
  assigned_to_name: string;
  sla_deadline?: string;
  sla_status: 'ok' | 'warning' | 'breached';
  created_at: string;
  updated_at: string;
  public_comments: TicketComment[];
}

// API functions
export const getDashboardStats = (): Promise<DashboardStats> =>
  api.get('/dashboard/stats/').then((r) => r.data);

export const getTicketsByStatus = (): Promise<TicketCountByStatus[]> =>
  api.get('/dashboard/by-status/').then((r) => r.data);

export const getTicketsByPriority = (): Promise<TicketCountByPriority[]> =>
  api.get('/dashboard/by-priority/').then((r) => r.data);

export const getTicketsTrend = (days = 14): Promise<TrendData[]> =>
  api.get('/dashboard/trend/', { params: { days } }).then((r) => r.data);

export const getAgentPerformance = (): Promise<AgentPerformance[]> =>
  api.get('/dashboard/agent-performance/').then((r) => r.data);

export const getTickets = (params?: Record<string, string>): Promise<{ count: number; results: Ticket[]; next: string | null; previous: string | null }> =>
  api.get('/tickets/', { params }).then((r) => r.data);

export const getTicket = (id: string): Promise<Ticket> =>
  api.get(`/tickets/${id}/`).then((r) => r.data);

export const createTicket = (data: Partial<Ticket>): Promise<Ticket> =>
  api.post('/tickets/', data).then((r) => r.data);

export const updateTicket = (id: string, data: Partial<Ticket>): Promise<Ticket> =>
  api.patch(`/tickets/${id}/`, data).then((r) => r.data);

export const bulkUpdateTickets = (data: { ids: string[]; status?: string; priority?: string; assigned_to_id?: string | null }): Promise<{ updated: number }> =>
  api.patch('/tickets/bulk/', data).then((r) => r.data);

export const getTicketStatusPortal = (ticketNumber: string): Promise<PublicTicketStatus> =>
  api.get(`/tickets/status/${ticketNumber}/`).then((r) => r.data);

export const getTicketComments = (ticketId: string): Promise<TicketComment[]> =>
  api.get(`/tickets/${ticketId}/comments/`).then((r) => r.data);

export const addTicketComment = (ticketId: string, data: Partial<TicketComment>): Promise<TicketComment> =>
  api.post(`/tickets/${ticketId}/comments/`, data).then((r) => r.data);

export const getTicketAttachments = (ticketId: string): Promise<TicketAttachment[]> =>
  api.get(`/tickets/${ticketId}/attachments/`).then((r) => r.data);

export const uploadTicketAttachment = (ticketId: string, formData: FormData): Promise<TicketAttachment> =>
  api.post(`/tickets/${ticketId}/attachments/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);

export const deleteTicketAttachment = (ticketId: string, attachmentId: string): Promise<void> =>
  api.delete(`/tickets/${ticketId}/attachments/${attachmentId}/`).then((r) => r.data);

export const getTicketRelations = (ticketId: string): Promise<TicketRelation[]> =>
  api.get(`/tickets/${ticketId}/relations/`).then((r) => r.data);

export const createTicketRelation = (ticketId: string, data: { to_ticket_id: string; relation_type: string }): Promise<TicketRelation> =>
  api.post(`/tickets/${ticketId}/relations/`, data).then((r) => r.data);

export const deleteTicketRelation = (ticketId: string, relationId: string): Promise<void> =>
  api.delete(`/tickets/${ticketId}/relations/${relationId}/`).then((r) => r.data);

export const getAgents = (): Promise<Agent[]> =>
  api.get('/agents/').then((r) => r.data);

export const getCannedResponses = (params?: Record<string, string>): Promise<CannedResponse[]> =>
  api.get('/canned-responses/', { params }).then((r) => r.data);

export const createCannedResponse = (data: Partial<CannedResponse>): Promise<CannedResponse> =>
  api.post('/canned-responses/', data).then((r) => r.data);

export const updateCannedResponse = (id: string, data: Partial<CannedResponse>): Promise<CannedResponse> =>
  api.patch(`/canned-responses/${id}/`, data).then((r) => r.data);

export const deleteCannedResponse = (id: string): Promise<void> =>
  api.delete(`/canned-responses/${id}/`).then((r) => r.data);

export const getSLAConfigs = (): Promise<SLAConfig[]> =>
  api.get('/sla-configs/').then((r) => r.data);
