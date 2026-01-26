#!/usr/bin/env node
/**
 * Local development server for API endpoints
 * This allows testing the API without Vercel CLI
 * 
 * Usage: node scripts/dev-server.mjs
 */

import { createServer } from 'http';
import { parse } from 'url';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Load environment variables from .env.local if exists
try {
  const envPath = join(projectRoot, '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
  console.log('📋 Loaded .env.local');
} catch (e) {
  console.log('⚠️ No .env.local found, using existing environment');
}

const PORT = process.env.API_PORT || 3000;

// Dynamic import of API handlers (compiled from TypeScript)
const apiHandlers = {};

async function loadHandler(name) {
  if (!apiHandlers[name]) {
    try {
      // Import the compiled JS from dist/api or use ts-node
      const modulePath = `file://${join(projectRoot, 'api', name)}.ts`;
      // For now, we'll need to compile first or use tsx
      console.log(`Loading handler: ${name}`);
    } catch (e) {
      console.error(`Failed to load handler ${name}:`, e);
    }
  }
  return apiHandlers[name];
}

// Simple request handler
const server = createServer(async (req, res) => {
  const { pathname, query } = parse(req.url || '', true);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  console.log(`${req.method} ${pathname}`);

  // API routes would be handled here
  // For full functionality, use: npx tsx watch scripts/dev-server.mjs
  
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    error: 'Not implemented', 
    message: 'Para pruebas completas de API, usa: vercel dev (requiere login)' 
  }));
});

server.listen(PORT, () => {
  console.log(`
🚀 API Dev Server running at http://localhost:${PORT}

⚠️  Para funcionalidad completa de API, necesitas:
    1. Ejecutar: vercel login
    2. Ejecutar: vercel dev

📋 O desplegar a Vercel para pruebas en producción.

Frontend está disponible en: http://localhost:3001
  `);
});
