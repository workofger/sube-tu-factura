import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from './lib/supabase';

interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  sort_order: number;
}

/**
 * GET /api/projects
 * Get all active projects for dropdown
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Use GET request'
    });
  }

  try {
    const supabase = getSupabaseClient();
    
    // Get all active projects ordered by sort_order
    const { data, error } = await supabase
      .from('projects')
      .select('id, code, name, description, color, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const projects: Project[] = data || [];

    return res.status(200).json({
      success: true,
      data: projects,
      count: projects.length
    });

  } catch (error) {
    console.error('Projects fetch error:', error);

    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al obtener proyectos',
      details: [error instanceof Error ? error.message : 'Unknown error']
    });
  }
}
