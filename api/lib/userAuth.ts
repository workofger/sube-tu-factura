import type { VercelRequest } from '@vercel/node';
import { createHash, createHmac, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { getSupabaseClient } from './supabase.js';

// JWT configuration
const USER_JWT_SECRET = process.env.USER_JWT_SECRET || 'change-this-user-secret-in-production';
const TOKEN_EXPIRY_HOURS = 168; // 7 days
const MAGIC_LINK_EXPIRY_MINUTES = 15;
const PASSWORD_RESET_EXPIRY_MINUTES = 60;
const BCRYPT_ROUNDS = 12;

export interface UserPayload {
  flotilleroId: string;
  rfc: string;
  email: string;
  type: 'flotillero' | 'independiente';
  exp: number;
  iat: number;
}

export interface Flotillero {
  id: string;
  rfc: string;
  fiscal_name: string;
  email: string;
  phone: string | null;
  type: 'flotillero' | 'independiente';
  status: string;
  email_verified: boolean;
  last_login_at: string | null;
  bank_clabe: string | null;
  bank_name: string | null;
}

// ========== JWT Functions ==========

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

export function createUserJWT(payload: Omit<UserPayload, 'iat' | 'exp'>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  
  const fullPayload: UserPayload = {
    ...payload,
    iat: now,
    exp: now + (TOKEN_EXPIRY_HOURS * 60 * 60),
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload));
  
  const signature = createHmac('sha256', USER_JWT_SECRET)
    .update(`${headerEncoded}.${payloadEncoded}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

export function verifyUserJWT(token: string): UserPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerEncoded, payloadEncoded, signature] = parts;

    const expectedSignature = createHmac('sha256', USER_JWT_SECRET)
      .update(`${headerEncoded}.${payloadEncoded}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    if (signature !== expectedSignature) {
      console.warn('⚠️ Invalid user JWT signature');
      return null;
    }

    const payload: UserPayload = JSON.parse(base64UrlDecode(payloadEncoded));

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.warn('⚠️ User JWT expired');
      return null;
    }

    return payload;
  } catch (error) {
    console.error('❌ User JWT verification error:', error);
    return null;
  }
}

// ========== Password Functions ==========

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ========== Token Generation ==========

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ========== User Lookup ==========

export async function getFlotilleroByEmail(email: string): Promise<Flotillero | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('flotilleros')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !data) {
    return null;
  }

  return data as Flotillero;
}

export async function getFlotilleroById(id: string): Promise<Flotillero | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('flotilleros')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Flotillero;
}

// ========== Authentication Functions ==========

export async function validateUserCredentials(
  email: string, 
  password: string
): Promise<Flotillero | null> {
  const supabase = getSupabaseClient();
  
  const { data: flotillero, error } = await supabase
    .from('flotilleros')
    .select('*, password_hash')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !flotillero) {
    console.log('❌ Flotillero not found:', email);
    return null;
  }

  // Check if account is locked
  if (flotillero.locked_until && new Date(flotillero.locked_until) > new Date()) {
    console.log('❌ Account is locked:', email);
    return null;
  }

  // Check if password hash exists
  if (!flotillero.password_hash) {
    console.log('❌ No password set for:', email);
    return null;
  }

  // Verify password
  const validPassword = await verifyPassword(password, flotillero.password_hash);
  
  if (!validPassword) {
    // Increment failed attempts
    await supabase
      .from('flotilleros')
      .update({ 
        failed_login_attempts: (flotillero.failed_login_attempts || 0) + 1 
      })
      .eq('id', flotillero.id);

    console.log('❌ Invalid password for:', email);
    return null;
  }

  // Reset failed attempts and update last login
  await supabase
    .from('flotilleros')
    .update({ 
      failed_login_attempts: 0,
      last_login_at: new Date().toISOString(),
    })
    .eq('id', flotillero.id);

  // Remove password_hash from returned object
  const { password_hash: _, ...user } = flotillero;
  return user as Flotillero;
}

// ========== Magic Link Functions ==========

export async function createMagicLink(email: string): Promise<{ token: string; expiresAt: Date } | null> {
  const supabase = getSupabaseClient();
  
  // Find flotillero
  const flotillero = await getFlotilleroByEmail(email);
  if (!flotillero) {
    return null;
  }

  // Generate token
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + MAGIC_LINK_EXPIRY_MINUTES);

  // Save token
  const { error } = await supabase
    .from('flotilleros')
    .update({
      magic_link_token: hashToken(token),
      magic_link_expires_at: expiresAt.toISOString(),
    })
    .eq('id', flotillero.id);

  if (error) {
    console.error('❌ Error saving magic link:', error);
    return null;
  }

  return { token, expiresAt };
}

export async function verifyMagicLink(token: string): Promise<Flotillero | null> {
  const supabase = getSupabaseClient();
  const tokenHash = hashToken(token);

  const { data: flotillero, error } = await supabase
    .from('flotilleros')
    .select('*')
    .eq('magic_link_token', tokenHash)
    .single();

  if (error || !flotillero) {
    console.warn('⚠️ Magic link token not found');
    return null;
  }

  // Check expiration
  if (!flotillero.magic_link_expires_at || new Date(flotillero.magic_link_expires_at) < new Date()) {
    console.warn('⚠️ Magic link expired');
    return null;
  }

  // Clear token and mark email as verified
  await supabase
    .from('flotilleros')
    .update({
      magic_link_token: null,
      magic_link_expires_at: null,
      email_verified: true,
      last_login_at: new Date().toISOString(),
    })
    .eq('id', flotillero.id);

  return flotillero as Flotillero;
}

// ========== Password Reset Functions ==========

export async function createPasswordResetToken(email: string): Promise<{ token: string; expiresAt: Date } | null> {
  const supabase = getSupabaseClient();
  
  const flotillero = await getFlotilleroByEmail(email);
  if (!flotillero) {
    return null;
  }

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + PASSWORD_RESET_EXPIRY_MINUTES);

  const { error } = await supabase
    .from('flotilleros')
    .update({
      password_reset_token: hashToken(token),
      password_reset_expires_at: expiresAt.toISOString(),
    })
    .eq('id', flotillero.id);

  if (error) {
    console.error('❌ Error saving password reset token:', error);
    return null;
  }

  return { token, expiresAt };
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const tokenHash = hashToken(token);

  const { data: flotillero, error } = await supabase
    .from('flotilleros')
    .select('id, password_reset_expires_at')
    .eq('password_reset_token', tokenHash)
    .single();

  if (error || !flotillero) {
    console.warn('⚠️ Password reset token not found');
    return false;
  }

  if (!flotillero.password_reset_expires_at || new Date(flotillero.password_reset_expires_at) < new Date()) {
    console.warn('⚠️ Password reset token expired');
    return false;
  }

  const passwordHash = await hashPassword(newPassword);

  const { error: updateError } = await supabase
    .from('flotilleros')
    .update({
      password_hash: passwordHash,
      password_reset_token: null,
      password_reset_expires_at: null,
      failed_login_attempts: 0,
      locked_until: null,
    })
    .eq('id', flotillero.id);

  return !updateError;
}

// ========== Token Extraction ==========

export function extractUserToken(req: VercelRequest): string | null {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try cookie
  const cookies = req.cookies;
  if (cookies?.user_token) {
    return cookies.user_token;
  }

  return null;
}

// ========== User Authentication Middleware ==========

export async function verifyUserAuth(req: VercelRequest): Promise<Flotillero | null> {
  const token = extractUserToken(req);
  
  if (!token) {
    return null;
  }

  const payload = verifyUserJWT(token);
  if (!payload) {
    return null;
  }

  // Get fresh user data
  const flotillero = await getFlotilleroById(payload.flotilleroId);
  if (!flotillero || flotillero.status !== 'active') {
    return null;
  }

  return flotillero;
}

// ========== Auth Event Logging ==========

export async function logAuthEvent(
  flotilleroId: string | null,
  eventType: string,
  success: boolean,
  req: VercelRequest,
  failureReason?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabaseClient();

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                   req.headers['x-real-ip'] as string || 
                   'unknown';

  await supabase
    .from('user_auth_log')
    .insert({
      flotillero_id: flotilleroId,
      event_type: eventType,
      success,
      failure_reason: failureReason,
      ip_address: clientIp,
      user_agent: req.headers['user-agent'] || null,
      metadata: metadata || null,
    });
}
