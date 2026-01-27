import type { VercelRequest, VercelResponse } from '@vercel/node';
import ExcelJS from 'exceljs';
import { verifyAdminAuth, hasRole } from '../lib/adminAuth.js';
import { getSupabaseClient } from '../lib/supabase.js';
import { ApiResponse } from '../lib/types.js';

interface PaymentRow {
  flotillero_id: string;
  fiscal_name: string;
  rfc: string;
  email: string | null;
  bank_clabe: string | null;
  bank_institution_id: string | null;
  total_amount: number;
  net_amount: number;
  invoice_count: number;
}

interface SourceAccount {
  account_number: string;
  institution_id: string;
  institution_name: string;
  account_type: string;
}

/**
 * GET /api/admin/export-payments
 * Export payment file in XLSX format (Shinkansen/BBVA template)
 * 
 * Query params:
 * - week: number (required)
 * - year: number (required)
 * - project?: string (project_id, optional)
 * - status?: string (invoice status filter, default: approved,pending_payment)
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Use GET request',
    } as ApiResponse);
  }

  try {
    // Verify authentication
    const admin = await verifyAdminAuth(req);
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'No autorizado',
      } as ApiResponse);
    }

    // Check role - only finance and super_admin can export payments
    if (!hasRole(admin, 'finance')) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'No tienes permisos para exportar pagos',
      } as ApiResponse);
    }

    // Parse query params
    const { week, year, project, status } = req.query;

    if (!week || !year) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Parámetros week y year son requeridos',
      } as ApiResponse);
    }

    const weekNum = parseInt(week as string, 10);
    const yearNum = parseInt(year as string, 10);
    const statusFilter = (status as string)?.split(',') || ['approved', 'pending_payment'];

    const supabase = getSupabaseClient();

    // 1. Get source account configuration
    const { data: configData, error: configError } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'payment_source_account')
      .single();

    if (configError) {
      console.warn('⚠️ Could not load source account config, using defaults');
    }

    const sourceAccount: SourceAccount = configData?.value || {
      account_number: '012180001182078281',
      institution_id: 'BBVA_MEXICO_MX',
      institution_name: 'BBVA Mexico',
      account_type: 'clabe',
    };

    // 2. Query invoices grouped by flotillero (biller)
    let query = supabase
      .from('invoices')
      .select(`
        id,
        total_amount,
        net_payment_amount,
        biller_id,
        flotilleros!biller_id (
          id,
          fiscal_name,
          rfc,
          email,
          bank_clabe,
          bank_institution_id
        )
      `)
      .eq('payment_week', weekNum)
      .eq('payment_year', yearNum)
      .in('status', statusFilter);

    if (project) {
      query = query.eq('project_id', project);
    }

    const { data: invoices, error: invoicesError } = await query;

    if (invoicesError) {
      console.error('❌ Error fetching invoices:', invoicesError);
      throw invoicesError;
    }

    if (!invoices || invoices.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NO_DATA',
        message: 'No hay facturas para exportar con los filtros seleccionados',
      } as ApiResponse);
    }

    // 3. Aggregate by flotillero
    const paymentsByFlotillero = new Map<string, PaymentRow>();

    for (const invoice of invoices) {
      const flotillero = invoice.flotilleros as unknown as {
        id: string;
        fiscal_name: string;
        rfc: string;
        email: string | null;
        bank_clabe: string | null;
        bank_institution_id: string | null;
      };

      if (!flotillero) continue;

      const existing = paymentsByFlotillero.get(flotillero.id);
      const netAmount = invoice.net_payment_amount || invoice.total_amount;

      if (existing) {
        existing.total_amount += invoice.total_amount;
        existing.net_amount += netAmount;
        existing.invoice_count += 1;
      } else {
        paymentsByFlotillero.set(flotillero.id, {
          flotillero_id: flotillero.id,
          fiscal_name: flotillero.fiscal_name,
          rfc: flotillero.rfc,
          email: flotillero.email,
          bank_clabe: flotillero.bank_clabe,
          bank_institution_id: flotillero.bank_institution_id,
          total_amount: invoice.total_amount,
          net_amount: netAmount,
          invoice_count: 1,
        });
      }
    }

    const payments = Array.from(paymentsByFlotillero.values());

    // 4. Generate XLSX with Shinkansen format
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FacturaFlow AI';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Pagos', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    // Define columns (Shinkansen/BBVA format)
    worksheet.columns = [
      { header: 'Tipo de transacción', key: 'transaction_type', width: 20 },
      { header: 'Monto', key: 'amount', width: 18 },
      { header: 'Tipo de moneda', key: 'currency', width: 15 },
      { header: 'Nombre del destinatario', key: 'recipient_name', width: 40 },
      { header: 'Tipo de ID del destinatario', key: 'id_type', width: 25 },
      { header: 'ID del destinatario', key: 'recipient_id', width: 18 },
      { header: 'Email del destinatario', key: 'recipient_email', width: 35 },
      { header: 'Cuenta destino: número de cuenta', key: 'dest_account', width: 25 },
      { header: 'Cuenta destino: ID de institución financiera', key: 'dest_institution', width: 40 },
      { header: 'Cuenta destino: tipo de cuenta', key: 'dest_account_type', width: 28 },
      { header: '*OPCIONAL: Cuenta destino ABA', key: 'dest_aba', width: 28 },
      { header: '*OPCIONAL: Cuenta destino Código Swift', key: 'dest_swift', width: 35 },
      { header: 'Descripción', key: 'description', width: 30 },
      { header: 'Cuenta origen: número de cuenta', key: 'source_account', width: 28 },
      { header: 'Cuenta origen: ID de institución financiera', key: 'source_institution', width: 40 },
      { header: '*OPCIONAL: ID externo para orden de pago', key: 'external_id', width: 40 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    for (const payment of payments) {
      // Format amount as currency string with $ sign
      const formattedAmount = ` $${payment.net_amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} `;

      worksheet.addRow({
        transaction_type: 'WIRE_TRANSFER',
        amount: formattedAmount,
        currency: 'MXN',
        recipient_name: payment.fiscal_name,
        id_type: 'MXRFC',
        recipient_id: payment.rfc,
        recipient_email: payment.email || '',
        dest_account: payment.bank_clabe || '',
        dest_institution: '',
        dest_account_type: payment.bank_clabe ? 'clabe' : '',
        dest_aba: '',
        dest_swift: '',
        description: `SEM ${String(weekNum).padStart(2, '0')}`,
        source_account: sourceAccount.account_number,
        source_institution: sourceAccount.institution_id,
        external_id: '',
      });
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set response headers for XLSX download
    const filename = `Pago_Drivers_sem_${String(weekNum).padStart(2, '0')}_${yearNum}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.byteLength);

    // Log export
    console.log(`📊 Exported payment file: ${filename}`);
    console.log(`   - Total beneficiarios: ${payments.length}`);
    console.log(`   - Total facturas: ${invoices.length}`);
    console.log(`   - Monto total: $${payments.reduce((sum, p) => sum + p.net_amount, 0).toLocaleString()}`);

    return res.status(200).send(buffer);

  } catch (error) {
    console.error('❌ Error in export-payments endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al generar archivo de pagos',
      details: [(error as Error).message],
    } as ApiResponse);
  }
}
