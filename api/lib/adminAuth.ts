import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from './supabase.js';
import { createHmac } from 'crypto';

// JWT secret for signing tokens (use ADMIN_JWT_SECRET from env)
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'change-this-secret-in-production';
const TOKEN_EXPIRY_HOURS = 24;

export interface AdminUser {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'finance' | 'operations' | 'viewer';
  is_active: boolean;
}

export interface JWTPayload {
  adminId: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
}

/**
 * Simple JWT implementation (no external dependencies)
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf-8');
}

export function createJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + (TOKEN_EXPIRY_HOURS * 60 * 60),
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload));
  
  const signature = createHmac('sha256', JWT_SECRET)
    .update(`${headerEncoded}.${payloadEncoded}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerEncoded, payloadEncoded, signature] = parts;

    // Verify signature
    const expectedSignature = createHmac('sha256', JWT_SECRET)
      .update(`${headerEncoded}.${payloadEncoded}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    if (signature !== expectedSignature) {
      console.warn('⚠️ Invalid JWT signature');
      return null;
    }

    // Decode payload
    const payload: JWTPayload = JSON.parse(base64UrlDecode(payloadEncoded));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.warn('⚠️ JWT expired');
      return null;
    }

    return payload;
  } catch (error) {
    console.error('❌ JWT verification error:', error);
    return null;
  }
}

/**
 * Get admin user by email
 */
export async function getAdminByEmail(email: string): Promise<AdminUser | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as AdminUser;
}

/**
 * Get admin user by ID
 */
export async function getAdminById(adminId: string): Promise<AdminUser | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', adminId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as AdminUser;
}

/**
 * Validate admin credentials (simple password check via Supabase Auth)
 * For simplicity, we'll use a password hash stored in admin_users
 * or validate against a hardcoded admin password in env
 */
export async function validateAdminCredentials(
  email: string, 
  password: string
): Promise<AdminUser | null> {
  // Get the admin user first
  const admin = await getAdminByEmail(email);
  if (!admin) {
    console.log('❌ Admin not found:', email);
    return null;
  }

  // For now, validate against ADMIN_PASSWORD env variable
  // In production, you'd want to use proper password hashing
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    console.error('❌ ADMIN_PASSWORD not configured');
    return null;
  }

  if (password !== adminPassword) {
    console.log('❌ Invalid password for:', email);
    return null;
  }

  // Update last login
  const supabase = getSupabaseClient();
  await supabase
    .from('admin_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', admin.id);

  return admin;
}

/**
 * Extract JWT from request (Authorization header or cookie)
 */
export function extractToken(req: VercelRequest): string | null {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try cookie
  const cookies = req.cookies;
  if (cookies?.admin_token) {
    return cookies.admin_token;
  }

  return null;
}

/**
 * Middleware to verify admin authentication
 * Returns the admin user if authenticated, null otherwise
 */
export async function verifyAdminAuth(req: VercelRequest): Promise<AdminUser | null> {
  const token = extractToken(req);
  
  if (!token) {
    console.log('❌ No token provided');
    return null;
  }

  const payload = verifyJWT(token);
  if (!payload) {
    return null;
  }

  // Get fresh admin data
  const admin = await getAdminById(payload.adminId);
  if (!admin) {
    console.log('❌ Admin not found for token');
    return null;
  }

  return admin;
}

/**
 * Check if admin has required role
 */
export function hasRole(admin: AdminUser, requiredRole: string): boolean {
  const roleHierarchy = ['viewer', 'operations', 'finance', 'super_admin'];
  const adminRoleIndex = roleHierarchy.indexOf(admin.role);
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
  
  return adminRoleIndex >= requiredRoleIndex;
}

/**
 * Apply admin auth middleware to a handler
 */
export function withAdminAuth(
  handler: (req: VercelRequest, res: VercelResponse, admin: AdminUser) => Promise<void>,
  requiredRole?: string
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const admin = await verifyAdminAuth(req);
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'No autorizado. Inicia sesión.',
      });
    }

    if (requiredRole && !hasRole(admin, requiredRole)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'No tienes permisos para esta acción.',
      });
    }

    return handler(req, res, admin);
  };
}
