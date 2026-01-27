import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../lib/supabase.js';
import { verifyAdminToken, AdminRole } from '../lib/adminAuth.js';
import { ApiResponse } from '../lib/types.js';

interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  keywords: string[] | null;
  ai_description: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateProjectPayload {
  code: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sort_order?: number;
  keywords?: string[];
  ai_description?: string;
}

interface UpdateProjectPayload {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
  keywords?: string[];
  ai_description?: string;
}

/**
 * Admin Projects API
 * GET /api/admin/projects - List all projects (active and inactive)
 * POST /api/admin/projects - Create a new project
 * PUT /api/admin/projects - Update a project
 * DELETE /api/admin/projects?id=xxx - Soft delete (deactivate) a project
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify admin authentication
  const admin = await verifyAdminToken(req);
  if (!admin) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Sesión inválida o expirada'
    } as ApiResponse);
  }

  const supabase = getSupabaseClient();

  try {
    // ===== GET: List all projects =====
    if (req.method === 'GET') {
      const includeInactive = req.query.include_inactive === 'true';
      
      let query = supabase
        .from('projects')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return res.status(200).json({
        success: true,
        data: data as Project[],
        count: data?.length || 0
      });
    }

    // ===== POST: Create a new project =====
    if (req.method === 'POST') {
      // Only admin and super_admin can create projects
      if (![AdminRole.ADMIN, AdminRole.SUPER_ADMIN].includes(admin.role as AdminRole)) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'No tienes permisos para crear proyectos'
        } as ApiResponse);
      }

      const payload = req.body as CreateProjectPayload;

      // Validate required fields
      if (!payload.code || !payload.name) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Código y nombre son requeridos',
          details: ['code y name son campos obligatorios']
        } as ApiResponse);
      }

      // Normalize code
      const code = payload.code.toUpperCase().replace(/\s+/g, '_');

      // Check for duplicate code
      const { data: existing } = await supabase
        .from('projects')
        .select('id')
        .eq('code', code)
        .single();

      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'DUPLICATE',
          message: `Ya existe un proyecto con el código "${code}"`
        } as ApiResponse);
      }

      // Get max sort_order
      const { data: maxOrderData } = await supabase
        .from('projects')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();
      
      const nextOrder = (maxOrderData?.sort_order || 0) + 1;

      // Insert project
      const { data: newProject, error: insertError } = await supabase
        .from('projects')
        .insert({
          code,
          name: payload.name,
          description: payload.description || null,
          color: payload.color || '#6B7280',
          icon: payload.icon || null,
          sort_order: payload.sort_order ?? nextOrder,
          is_active: true,
          keywords: payload.keywords || [],
          ai_description: payload.ai_description || null
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create project: ${insertError.message}`);
      }

      console.log(`✅ Project created by ${admin.email}: ${code}`);

      return res.status(201).json({
        success: true,
        message: 'Proyecto creado exitosamente',
        data: newProject
      });
    }

    // ===== PUT: Update a project =====
    if (req.method === 'PUT') {
      // Only admin and super_admin can update projects
      if (![AdminRole.ADMIN, AdminRole.SUPER_ADMIN].includes(admin.role as AdminRole)) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'No tienes permisos para editar proyectos'
        } as ApiResponse);
      }

      const payload = req.body as UpdateProjectPayload;

      if (!payload.id) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'ID del proyecto es requerido'
        } as ApiResponse);
      }

      // Build update object
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };

      if (payload.code) updateData.code = payload.code.toUpperCase().replace(/\s+/g, '_');
      if (payload.name) updateData.name = payload.name;
      if (payload.description !== undefined) updateData.description = payload.description || null;
      if (payload.color) updateData.color = payload.color;
      if (payload.icon !== undefined) updateData.icon = payload.icon || null;
      if (payload.sort_order !== undefined) updateData.sort_order = payload.sort_order;
      if (payload.is_active !== undefined) updateData.is_active = payload.is_active;
      if (payload.keywords !== undefined) updateData.keywords = payload.keywords;
      if (payload.ai_description !== undefined) updateData.ai_description = payload.ai_description || null;

      const { data: updatedProject, error: updateError } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', payload.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update project: ${updateError.message}`);
      }

      console.log(`✅ Project updated by ${admin.email}: ${payload.id}`);

      return res.status(200).json({
        success: true,
        message: 'Proyecto actualizado exitosamente',
        data: updatedProject
      });
    }

    // ===== DELETE: Soft delete (deactivate) a project =====
    if (req.method === 'DELETE') {
      // Only super_admin can delete projects
      if (admin.role !== AdminRole.SUPER_ADMIN) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Solo super admin puede desactivar proyectos'
        } as ApiResponse);
      }

      const projectId = req.query.id as string;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'ID del proyecto es requerido'
        } as ApiResponse);
      }

      // Soft delete - just deactivate
      const { error: deleteError } = await supabase
        .from('projects')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (deleteError) {
        throw new Error(`Failed to deactivate project: ${deleteError.message}`);
      }

      console.log(`✅ Project deactivated by ${admin.email}: ${projectId}`);

      return res.status(200).json({
        success: true,
        message: 'Proyecto desactivado exitosamente'
      });
    }

    // Method not allowed
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Método no permitido'
    } as ApiResponse);

  } catch (error) {
    console.error('❌ Admin projects error:', error);

    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      details: [error instanceof Error ? error.message : 'Unknown error']
    } as ApiResponse);
  }
}
