/**
 * User API Service
 * All user operations go through backend API endpoints
 */

const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : '';

// Store token in memory and localStorage
let authToken: string | null = null;

export interface UserProfile {
  id: string;
  rfc: string | null;
  fiscal_name: string | null;
  trade_name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  type: 'flotillero' | 'independiente';
  status: string;
  email_verified: boolean;
  bank_name: string | null;
  bank_clabe: string | null;
  bank_institution_id: string | null;
  onboarding_completed: boolean;
  requires_password_change: boolean;
  last_login_at: string | null;
  created_at: string;
  stats?: {
    drivers_count: number;
    invoices_total: number;
    invoices_paid: number;
    invoices_pending: number;
    total_facturado: number;
  };
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export interface OnboardingStatus {
  currentStep: string;
  steps: {
    verify_email: { completed: boolean; required: boolean };
    bank_info: { completed: boolean; required: boolean };
    profile_info: { completed: boolean; required: boolean };
    change_password: { completed: boolean; required: boolean };
  };
  isComplete: boolean;
  canComplete: boolean;
  user: {
    email: string;
    email_verified: boolean;
    rfc: string | null;
    fiscal_name: string | null;
    phone: string | null;
    address: string | null;
    bank_name: string | null;
    bank_clabe: string | null;
    requires_password_change: boolean;
  };
}

export interface UserInvoice {
  id: string;
  uuid: string;
  folio: string | null;
  invoice_date: string;
  total_amount: number;
  net_payment_amount: number | null;
  payment_program: string;
  pronto_pago_fee_amount: number | null;
  payment_week: number;
  payment_year: number;
  status: string;
  created_at: string;
  project_name: string | null;
  project_code: string | null;
  is_late?: boolean;
  late_reason?: string | null;
}

export interface InvoicesResponse {
  invoices: UserInvoice[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    total_facturado: number;
    total_pendiente: number;
    total_pagado: number;
    count_pending: number;
    count_paid: number;
  };
}

// ========== Token Management ==========

export function setUserToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('user_token', token);
  } else {
    localStorage.removeItem('user_token');
  }
}

export function getStoredUserToken(): string | null {
  if (authToken) return authToken;
  return localStorage.getItem('user_token');
}

// ========== API Request Helper ==========

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message: string; error?: string; details?: string[] }> {
  const token = getStoredUserToken();

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
        details: data.details,
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

// ========== Authentication ==========

export async function userLogin(
  email: string,
  password: string
): Promise<{ success: boolean; user?: UserProfile; message: string }> {
  const result = await apiRequest<LoginResponse>('/api/user/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (result.success && result.data) {
    setUserToken(result.data.token);
    return {
      success: true,
      user: result.data.user,
      message: result.message,
    };
  }

  return {
    success: false,
    message: result.message,
  };
}

export async function userLogout(): Promise<void> {
  // No need to call server for logout, just clear token
  setUserToken(null);
}

export async function checkUserSession(): Promise<{
  isValid: boolean;
  user?: UserProfile;
}> {
  const token = getStoredUserToken();
  if (!token) {
    return { isValid: false };
  }

  const result = await apiRequest<UserProfile>('/api/user/profile');

  if (result.success && result.data) {
    return {
      isValid: true,
      user: result.data,
    };
  }

  // Token invalid, clear it
  setUserToken(null);
  return { isValid: false };
}

// ========== Profile ==========

export async function getUserProfile(): Promise<{
  success: boolean;
  data?: UserProfile;
  message: string;
}> {
  return apiRequest<UserProfile>('/api/user/profile');
}

export async function updateUserProfile(data: {
  phone?: string;
  address?: string;
  trade_name?: string;
  bank_name?: string;
  bank_clabe?: string;
  bank_institution_id?: string;
}): Promise<{
  success: boolean;
  data?: Partial<UserProfile>;
  message: string;
}> {
  return apiRequest('/api/user/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ========== Onboarding ==========

export async function getOnboardingStatus(): Promise<{
  success: boolean;
  data?: OnboardingStatus;
  message: string;
}> {
  return apiRequest<OnboardingStatus>('/api/user/onboarding');
}

export async function updateOnboardingBank(data: {
  bank_name: string;
  bank_clabe: string;
  bank_account_number?: string;
  bank_institution_id?: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  return apiRequest('/api/user/onboarding?step=bank', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateOnboardingProfile(data: {
  rfc: string;
  fiscal_name: string;
  phone: string;
  address: string;
  trade_name?: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  return apiRequest('/api/user/onboarding?step=profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateOnboardingPassword(data: {
  current_password: string;
  new_password: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  return apiRequest('/api/user/onboarding?step=password', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function completeOnboarding(): Promise<{
  success: boolean;
  message: string;
}> {
  return apiRequest('/api/user/onboarding', {
    method: 'POST',
  });
}

// ========== Invoices ==========

export interface InvoiceFilters {
  page?: number;
  pageSize?: number;
  status?: string;
  week?: number;
  year?: number;
}

export async function getUserInvoices(
  filters: InvoiceFilters = {}
): Promise<{
  success: boolean;
  data?: InvoicesResponse;
  message: string;
}> {
  const params = new URLSearchParams();

  if (filters.page) params.set('page', filters.page.toString());
  if (filters.pageSize) params.set('pageSize', filters.pageSize.toString());
  if (filters.status) params.set('status', filters.status);
  if (filters.week) params.set('week', filters.week.toString());
  if (filters.year) params.set('year', filters.year.toString());

  return apiRequest<InvoicesResponse>(`/api/user/invoices?${params.toString()}`);
}

// ========== Magic Link ==========

export async function requestMagicLink(email: string): Promise<{
  success: boolean;
  message: string;
}> {
  return apiRequest('/api/user/magic-link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyMagicLink(token: string): Promise<{
  success: boolean;
  user?: UserProfile;
  message: string;
}> {
  const result = await apiRequest<LoginResponse>(`/api/user/verify-magic-link?token=${token}`);

  if (result.success && result.data) {
    setUserToken(result.data.token);
    return {
      success: true,
      user: result.data.user,
      message: result.message,
    };
  }

  return {
    success: false,
    message: result.message,
  };
}

// ========== Password Reset ==========

export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  message: string;
}> {
  return apiRequest('/api/user/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{
  success: boolean;
  message: string;
}> {
  return apiRequest('/api/user/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}
