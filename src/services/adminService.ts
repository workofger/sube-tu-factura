/**
 * Admin API Service
 * All admin operations go through backend API endpoints
 */

const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : '';

// Store token in memory (will be lost on page refresh)
let authToken: string | null = null;

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'finance' | 'operations' | 'viewer';
}

export interface LoginResponse {
  token: string;
  admin: AdminUser;
  expiresIn: number;
}

export interface DashboardStats {
  totalInvoices: number;
  totalAmount: number;
  totalProntoPago: number;
  totalStandard: number;
  prontoPagoAmount: number;
  standardAmount: number;
  prontoPagoFees: number;
  thisWeekInvoices: number;
  lastWeekInvoices: number;
  currentWeek: number;
  currentYear: number;
}

export interface RecentInvoice {
  id: string;
  uuid: string;
  issuer_name: string;
  total_amount: number;
  payment_program: string;
  created_at: string;
  status: string;
}

export interface InvoiceListItem {
  id: string;
  uuid: string;
  folio: string | null;
  issuer_rfc: string;
  issuer_name: string;
  total_amount: number;
  net_payment_amount: number | null;
  payment_program: string;
  pronto_pago_fee_amount: number | null;
  payment_week: number;
  payment_year: number;
  invoice_date: string;
  status: string;
  created_at: string;
  project_name: string | null;
  project_code: string | null;
}

export interface InvoicesResponse {
  invoices: InvoiceListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface InvoiceFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  week?: number;
  year?: number;
  project?: string;
  paymentProgram?: string;
  status?: string;
}

export interface ExportFilters {
  weekFrom?: number;
  weekTo?: number;
  year?: number;
  project?: string;
  paymentProgram?: string;
  format?: 'csv' | 'json';
}

/**
 * Set the auth token (called after login)
 */
export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('admin_token', token);
  } else {
    localStorage.removeItem('admin_token');
  }
}

/**
 * Get stored token
 */
export function getStoredToken(): string | null {
  if (authToken) return authToken;
  return localStorage.getItem('admin_token');
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message: string; error?: string }> {
  const token = getStoredToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Error en la solicitud',
        error: data.error,
      };
    }

    return {
      success: true,
      data: data.data,
      message: data.message || 'OK',
    };
  } catch (error) {
    console.error('API request error:', error);
    return {
      success: false,
      message: 'Error de conexión',
      error: 'NETWORK_ERROR',
    };
  }
}

/**
 * Login admin user
 */
export async function adminLogin(
  email: string,
  password: string
): Promise<{ success: boolean; admin?: AdminUser; message: string }> {
  const result = await apiRequest<LoginResponse>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (result.success && result.data) {
    setAuthToken(result.data.token);
    return {
      success: true,
      admin: result.data.admin,
      message: result.message,
    };
  }

  return {
    success: false,
    message: result.message,
  };
}

/**
 * Logout admin user
 */
export async function adminLogout(): Promise<void> {
  await apiRequest('/api/admin/logout', { method: 'POST' });
  setAuthToken(null);
}

/**
 * Check current session
 */
export async function checkSession(): Promise<{ 
  isValid: boolean; 
  admin?: AdminUser 
}> {
  const token = getStoredToken();
  if (!token) {
    return { isValid: false };
  }

  const result = await apiRequest<{ admin: AdminUser }>('/api/admin/session');

  if (result.success && result.data) {
    return {
      isValid: true,
      admin: result.data.admin,
    };
  }

  // Token invalid, clear it
  setAuthToken(null);
  return { isValid: false };
}

/**
 * Get dashboard stats
 */
export async function getStats(): Promise<{
  success: boolean;
  stats?: DashboardStats;
  recentInvoices?: RecentInvoice[];
  message: string;
}> {
  const result = await apiRequest<{ stats: DashboardStats; recentInvoices: RecentInvoice[] }>(
    '/api/admin/stats'
  );

  if (result.success && result.data) {
    return {
      success: true,
      stats: result.data.stats,
      recentInvoices: result.data.recentInvoices,
      message: result.message,
    };
  }

  return {
    success: false,
    message: result.message,
  };
}

/**
 * Get invoices with filters
 */
export async function getInvoices(
  filters: InvoiceFilters = {}
): Promise<{
  success: boolean;
  data?: InvoicesResponse;
  message: string;
}> {
  const params = new URLSearchParams();
  
  if (filters.page) params.set('page', filters.page.toString());
  if (filters.pageSize) params.set('pageSize', filters.pageSize.toString());
  if (filters.search) params.set('search', filters.search);
  if (filters.week) params.set('week', filters.week.toString());
  if (filters.year) params.set('year', filters.year.toString());
  if (filters.project) params.set('project', filters.project);
  if (filters.paymentProgram) params.set('paymentProgram', filters.paymentProgram);
  if (filters.status) params.set('status', filters.status);

  const result = await apiRequest<InvoicesResponse>(
    `/api/admin/invoices?${params.toString()}`
  );

  if (result.success && result.data) {
    return {
      success: true,
      data: result.data,
      message: result.message,
    };
  }

  return {
    success: false,
    message: result.message,
  };
}

/**
 * Export invoices to CSV (returns blob URL)
 */
export async function exportInvoicesCSV(
  filters: ExportFilters = {}
): Promise<{ success: boolean; message: string }> {
  const token = getStoredToken();
  
  const params = new URLSearchParams();
  params.set('format', 'csv');
  if (filters.weekFrom) params.set('weekFrom', filters.weekFrom.toString());
  if (filters.weekTo) params.set('weekTo', filters.weekTo.toString());
  if (filters.year) params.set('year', filters.year.toString());
  if (filters.project) params.set('project', filters.project);
  if (filters.paymentProgram) params.set('paymentProgram', filters.paymentProgram);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/export?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, message: error.message || 'Error al exportar' };
    }

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'facturas.csv';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match) filename = match[1];
    }

    // Download the file
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, message: 'Archivo descargado' };
  } catch (error) {
    console.error('Export error:', error);
    return { success: false, message: 'Error de conexión al exportar' };
  }
}

/**
 * Export invoices to JSON
 */
export async function exportInvoicesJSON(
  filters: ExportFilters = {}
): Promise<{
  success: boolean;
  data?: unknown;
  message: string;
}> {
  const params = new URLSearchParams();
  params.set('format', 'json');
  if (filters.weekFrom) params.set('weekFrom', filters.weekFrom.toString());
  if (filters.weekTo) params.set('weekTo', filters.weekTo.toString());
  if (filters.year) params.set('year', filters.year.toString());
  if (filters.project) params.set('project', filters.project);
  if (filters.paymentProgram) params.set('paymentProgram', filters.paymentProgram);

  const result = await apiRequest(`/api/admin/export?${params.toString()}`);
  return result;
}

/**
 * Export payments XLSX (Shinkansen format for bank transfers)
 */
export interface PaymentExportFilters {
  week: number;
  year: number;
  project?: string;
  status?: string;
}

export async function exportPaymentsXLSX(
  filters: PaymentExportFilters
): Promise<{ success: boolean; message: string }> {
  const token = getStoredToken();
  
  const params = new URLSearchParams();
  params.set('week', filters.week.toString());
  params.set('year', filters.year.toString());
  if (filters.project) params.set('project', filters.project);
  if (filters.status) params.set('status', filters.status);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/export-payments?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, message: error.message || 'Error al exportar pagos' };
    }

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `Pago_Drivers_sem_${String(filters.week).padStart(2, '0')}_${filters.year}.xlsx`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match) filename = match[1];
    }

    // Download the file
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, message: 'Archivo de pagos descargado' };
  } catch (error) {
    console.error('Payment export error:', error);
    return { success: false, message: 'Error de conexión al exportar pagos' };
  }
}

// ========== System Config ==========

export interface SystemConfig {
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  category: string;
  is_sensitive: boolean;
  updated_at: string;
}

export async function getSystemConfig(key?: string): Promise<{
  success: boolean;
  data?: SystemConfig | SystemConfig[];
  message: string;
}> {
  const endpoint = key 
    ? `/api/admin/config?key=${encodeURIComponent(key)}`
    : '/api/admin/config';
  
  return apiRequest(endpoint);
}

export async function updateSystemConfig(
  key: string,
  value: Record<string, unknown>,
  description?: string
): Promise<{
  success: boolean;
  data?: SystemConfig;
  message: string;
}> {
  return apiRequest(`/api/admin/config?key=${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value, description }),
  });
}

// ========== API Keys ==========

export interface ApiKeyInfo {
  id: string;
  name: string;
  description: string | null;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  total_requests: number;
  expires_at: string | null;
  status: 'active' | 'expired' | 'revoked';
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string; // Full key - only shown once!
  prefix: string;
  scopes: string[];
  expires_at: string | null;
}

export async function listApiKeys(): Promise<{
  success: boolean;
  data?: ApiKeyInfo[];
  message: string;
}> {
  return apiRequest('/api/admin/api-keys');
}

export async function createApiKey(params: {
  name: string;
  description?: string;
  scopes?: string[];
  rate_limit_per_minute?: number;
  rate_limit_per_day?: number;
  expires_in_days?: number;
}): Promise<{
  success: boolean;
  data?: CreateApiKeyResponse;
  message: string;
}> {
  return apiRequest('/api/admin/api-keys', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function revokeApiKey(id: string): Promise<{
  success: boolean;
  message: string;
}> {
  return apiRequest(`/api/admin/api-keys?id=${id}`, {
    method: 'DELETE',
  });
}
