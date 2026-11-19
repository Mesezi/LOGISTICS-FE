import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export const api = axios.create({ baseURL: BASE_URL });

// Token injector — set by the app shell on mount and after auth changes
let _getToken: (() => Promise<string | null>) | null = null;

export function setTokenGetter(fn: () => Promise<string | null>) {
  _getToken = fn;
}

api.interceptors.request.use(async (config) => {
  if (_getToken) {
    const token = await _getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: Meta;
}

export interface User {
  id: number;
  account_id: number;
  account: Pick<Account, 'id' | 'name' | 'image_url'>;
  clerk_id: string;
  name: string;
  email: string;
  image_url: string | null;
  role: 'admin' | 'staff';
  created_at: string;
}

export interface Account {
  id: number;
  name: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: number;
  account_id: number;
  user_id: number;
  name: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
}

export interface Rider {
  id: number;
  account_id: number;
  name: string;
  phone: string | null;
  active: boolean;
  created_at: string;
}

export interface Partner {
  id: number;
  account_id: number;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type JobStatus = 'pending' | 'picked_up' | 'delivered' | 'failed' | 'cancelled';
export type PaymentMode = 'cash' | 'transfer';
export type ExpenseOwner = 'rider' | 'client' | 'office';

export interface Job {
  id: number;
  account_id: number;
  client_id: number;
  rider_id: number | null;
  status: JobStatus;
  pickup: string;
  dropoff: string;
  description: string | null;
  job_date: string;
  office_fee: number;
  sublet_name: string | null;
  sublet_amount: number;
  park_waybill: number;
  partner_id?: number | null;
  partner_name_snapshot?: string | null;
  partner?: Pick<Partner, 'id' | 'name'> | null;
  partner_name?: string | null;
  partner_amount: number;
  total: number;
  received?: number;
  created_at: string;
  client?: Pick<Client, 'id' | 'name' | 'phone'>;
  rider?: Pick<Rider, 'id' | 'name'> | null;
}

export interface JobDetail extends Job {
  payments: Payment[];
  expenses: Expense[];
  received: number;
  debt: number;
  profit: number;
}

export interface Payment {
  id: number;
  job_id: number;
  type: 'payment' | 'refund';
  amount: number;
  mode: PaymentMode;
  bank_name: string | null;
  note: string | null;
  reference: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Expense {
  id: number;
  account_id: number;
  description: string;
  amount: number;
  mode: PaymentMode;
  bank_name: string | null;
  note: string | null;
  owner: ExpenseOwner;
  rider_id: number | null;
  client_id: number | null;
  job_id: number | null;
  expense_date: string | null;
  created_at: string;
  rider?: Pick<Rider, 'id' | 'name'> | null;
  client?: Pick<Client, 'id' | 'name'> | null;
}

export interface DailyReport {
  date: string;
  jobCount: number;
  deliveredJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  officeFees: number;
  subletFees: number;
  partnerAndWaybillFees: number;
  paymentsReceived: number;
  refundsIssued: number;
  expenses: number;
}

export interface AuditLog {
  id: number;
  account_id: number;
  user_id: number;
  table_name: string;
  record_id: number;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
  user: Pick<User, 'id' | 'name' | 'email'>;
}

// ── API helpers ───────────────────────────────────────────────────────────────

export const authApi = {
  me: () => api.get<User>('/users/me').then(r => r.data),
  register: (account_name: string) =>
    api.post<{ account: Account; user: User }>('/auth/register', { account_name }).then(r => r.data),
  acceptInvitation: (token: string) =>
    api.post<{ user: User }>('/auth/accept-invitation', { token }).then(r => r.data),
  invite: (email: string, role: 'staff' | 'admin') =>
    api.post('/users/invite', { email, role }).then(r => r.data),
};

export const clientsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Paginated<Client>>('/clients', { params }).then(r => r.data),
  get: (id: number) => api.get<{ data: Client }>(`/clients/${id}`).then(r => r.data.data),
  create: (body: { name: string; phone?: string; notes?: string }) =>
    api.post<{ data: Client }>('/clients', body).then(r => r.data.data),
  update: (id: number, body: Partial<{ name: string; phone: string; notes: string }>) =>
    api.patch<{ data: Client }>(`/clients/${id}`, body).then(r => r.data.data),
  delete: (id: number) => api.delete(`/clients/${id}`),
};

export const ridersApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Paginated<Rider>>('/riders', { params }).then(r => r.data),
  get: (id: number) => api.get<{ data: Rider }>(`/riders/${id}`).then(r => r.data.data),
  create: (body: { name: string; phone?: string }) =>
    api.post<{ data: Rider }>('/riders', body).then(r => r.data.data),
  update: (id: number, body: Partial<{ name: string; phone: string; active: boolean }>) =>
    api.patch<{ data: Rider }>(`/riders/${id}`, body).then(r => r.data.data),
  delete: (id: number) => api.delete(`/riders/${id}`),
};

export const partnersApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Paginated<Partner>>('/partners', { params }).then(r => r.data),
  get: (id: number) => api.get<{ data: Partner }>(`/partners/${id}`).then(r => r.data.data),
  create: (body: { name: string; phone?: string; email?: string; notes?: string }) =>
    api.post<{ data: Partner }>('/partners', body).then(r => r.data.data),
  update: (id: number, body: Partial<{ name: string; phone: string | null; email: string | null; notes: string | null; active: boolean }>) =>
    api.patch<{ data: Partner }>(`/partners/${id}`, body).then(r => r.data.data),
};

export const jobsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Paginated<Job>>('/jobs', { params }).then(r => r.data),
  get: (id: number) => api.get<{ data: JobDetail }>(`/jobs/${id}`).then(r => r.data.data),
  create: (body: Record<string, unknown>) =>
    api.post<{ data: Job }>('/jobs', body).then(r => r.data.data),
  update: (id: number, body: Record<string, unknown>) =>
    api.patch<{ data: Job }>(`/jobs/${id}`, body).then(r => r.data.data),
  delete: (id: number) => api.delete(`/jobs/${id}`),
  cancel: (id: number) => api.post<{ data: Job }>(`/jobs/${id}/cancel`).then(r => r.data.data),
  payments: (id: number) =>
    api.get<{ data: Payment[] }>(`/jobs/${id}/payments`).then(r => r.data.data),
  addPayment: (id: number, body: Record<string, unknown>) =>
    api.post<{ data: Payment }>(`/jobs/${id}/payments`, body).then(r => r.data.data),
  addRefund: (id: number, body: Record<string, unknown>) =>
    api.post<{ data: Payment }>(`/jobs/${id}/refunds`, body).then(r => r.data.data),
};

export const paymentsApi = {
  update: (id: number, body: Record<string, unknown>) =>
    api.patch<{ data: Payment }>(`/payments/${id}`, body).then(r => r.data.data),
  delete: (id: number) => api.delete(`/payments/${id}`),
};

export const expensesApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Paginated<Expense>>('/expenses', { params }).then(r => r.data),
  get: (id: number) => api.get<{ data: Expense }>(`/expenses/${id}`).then(r => r.data.data),
  create: (body: Record<string, unknown>) =>
    api.post<{ data: Expense }>('/expenses', body).then(r => r.data.data),
  update: (id: number, body: Record<string, unknown>) =>
    api.patch<{ data: Expense }>(`/expenses/${id}`, body).then(r => r.data.data),
  delete: (id: number) => api.delete(`/expenses/${id}`),
};

export const reportsApi = {
  daily: (date?: string) =>
    api.get<DailyReport>('/reports/daily', { params: date ? { date } : {} }).then(r => r.data),
  exportDaily: (date: string) =>
    api.get<Blob>('/reports/daily/export', { params: { date }, responseType: 'blob' }).then(r => r.data),
  income: (params?: Record<string, unknown>) =>
    api.get('/reports/income', { params }).then(r => r.data),
  riders: (params?: Record<string, unknown>) =>
    api.get('/reports/riders', { params }).then(r => r.data),
  sublets: (params?: Record<string, unknown>) =>
    api.get('/reports/sublets', { params }).then(r => r.data),
  partners: (params?: Record<string, unknown>) =>
    api.get('/reports/partners', { params }).then(r => r.data),
  failedJobs: (params?: Record<string, unknown>) =>
    api.get('/reports/failed-jobs', { params }).then(r => r.data),
  debts: (params?: Record<string, unknown>) =>
    api.get('/reports/debts', { params }).then(r => r.data),
  clientStatement: (params: Record<string, unknown>) =>
    api.get('/reports/client-statement', { params }).then(r => r.data),
};

export const searchApi = {
  banks: (q: string) =>
    api.get<{ data: { name: string; usageCount: number }[] }>('/search/banks', { params: { q } }).then(r => r.data.data),
  locations: (q: string) =>
    api.get<{ data: { name: string; usageCount: number }[] }>('/search/locations', { params: { q } }).then(r => r.data.data),
};

export const accountsApi = {
  update: (body: { name?: string; image_url?: string | null }) =>
    api.patch<{ data: Account }>('/accounts/me', body).then(r => r.data.data),
};

export const auditApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Paginated<AuditLog>>('/audit-logs', { params }).then(r => r.data),
};
