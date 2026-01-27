import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  DbDriver, 
  DbInvoice, 
  DbProject, 
  DbFlotillero,
  InvoicePayload,
  InvoiceItem 
} from './types.js';

// Initialize Supabase client with Service Role Key
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let supabase: SupabaseClient;

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabase) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabase;
};

/**
 * Check if Supabase connection is healthy
 */
export const checkConnection = async (): Promise<boolean> => {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('projects').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
};

/**
 * Check if an invoice with the given UUID already exists
 */
export const checkUuidExists = async (uuid: string): Promise<{ exists: boolean; invoiceId?: string }> => {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('invoices')
    .select('id')
    .eq('uuid', uuid)
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Database error: ${error.message}`);
  }
  
  return {
    exists: !!data,
    invoiceId: data?.id
  };
};

/**
 * Get or create a flotillero (biller) by RFC
 * Flotilleros are the entities that issue invoices (can be independent drivers or fleet owners)
 */
export const upsertFlotillero = async (payload: InvoicePayload): Promise<DbFlotillero> => {
  const client = getSupabaseClient();
  const issuer = payload.issuer;
  
  // Extract regime code (first 3 chars)
  const regimeCode = issuer.regime ? issuer.regime.substring(0, 3) : null;
  
  const flotilleroData = {
    rfc: issuer.rfc,
    fiscal_name: issuer.name,
    fiscal_regime_code: regimeCode,
    fiscal_zip_code: issuer.zipCode || null,
    email: payload.contact.email || `${issuer.rfc.toLowerCase()}@pendiente.com`,
    phone: payload.contact.phone || null,
    type: 'independiente', // Default to independent, can be changed later
    status: 'active'
  };
  
  const { data, error } = await client
    .from('flotilleros')
    .upsert(flotilleroData, { 
      onConflict: 'rfc',
      ignoreDuplicates: false 
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to upsert flotillero: ${error.message}`);
  }
  
  return data as DbFlotillero;
};

/**
 * Get or create a driver by RFC
 * RFC is the unique identifier - same driver can upload multiple invoices
 */
export const upsertDriver = async (payload: InvoicePayload): Promise<DbDriver> => {
  const client = getSupabaseClient();
  const issuer = payload.issuer;
  
  // First, ensure flotillero exists
  const flotillero = await upsertFlotillero(payload);
  
  // Check if driver already exists by RFC
  const { data: existingDriver } = await client
    .from('drivers')
    .select('*')
    .eq('rfc', issuer.rfc)
    .single();
  
  // If driver exists, return it (no updates needed)
  if (existingDriver) {
    console.log('✅ Driver found by RFC:', issuer.rfc);
    return existingDriver as DbDriver;
  }
  
  // Create new driver
  console.log('📝 Creating new driver for RFC:', issuer.rfc);
  
  const nameParts = (issuer.name || '').trim().split(' ');
  const firstName = nameParts[0] || 'Sin nombre';
  const lastName = nameParts.slice(1).join(' ') || '';
  const regimeCode = issuer.regime ? issuer.regime.substring(0, 3) : null;
  const email = payload.contact.email || `${issuer.rfc.toLowerCase()}@pendiente.com`;
  
  const driverData = {
    rfc: issuer.rfc,
    fiscal_name: issuer.name,
    first_name: firstName,
    last_name: lastName,
    email: email,
    phone: payload.contact.phone || null,
    fiscal_regime_code: regimeCode,
    fiscal_zip_code: issuer.zipCode || null,
    flotillero_id: flotillero.id,
    status: 'active'
  };
  
  const { data, error } = await client
    .from('drivers')
    .insert(driverData)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create driver: ${error.message}`);
  }
  
  return data as DbDriver;
};

/**
 * Get project by name or code
 */
export const getProject = async (projectName: string): Promise<DbProject | null> => {
  const client = getSupabaseClient();
  
  const normalizedName = projectName.toUpperCase().replace(/ /g, '_');
  
  const { data, error } = await client
    .from('projects')
    .select('*')
    .or(`code.ilike.%${normalizedName}%,name.ilike.%${projectName}%`)
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get project: ${error.message}`);
  }
  
  return data as DbProject | null;
};

/**
 * Insert a new invoice with flotillero support
 */
export const insertInvoice = async (
  payload: InvoicePayload, 
  driverId: string, 
  projectId: string | null,
  billerId?: string // Optional: flotillero who issues the invoice
): Promise<DbInvoice> => {
  const client = getSupabaseClient();
  
  const invoiceYear = new Date(payload.invoice.date).getFullYear();
  
  // Get flotillero ID if not provided (for backwards compatibility)
  let flotilleroId = billerId;
  if (!flotilleroId) {
    const flotillero = await upsertFlotillero(payload);
    flotilleroId = flotillero.id;
  }
  
  // Helper to extract code from strings like "601 - Description" or just "601"
  const extractCode = (value: string | undefined, maxLen: number): string | null => {
    if (!value) return null;
    // If it contains " - ", take only the part before
    const code = value.split(' - ')[0].trim();
    return code.substring(0, maxLen);
  };
  
  // Base invoice data (core fields that always exist)
  const invoiceData: Record<string, unknown> = {
    driver_id: driverId,
    biller_id: flotilleroId,
    project_id: projectId,
    uuid: payload.invoice.uuid,
    folio: payload.invoice.folio || null,
    series: payload.invoice.series || null,
    invoice_date: payload.invoice.date,
    certification_date: payload.invoice.certificationDate || null,
    sat_cert_number: payload.invoice.satCertNumber || null,
    issuer_rfc: payload.issuer.rfc,
    issuer_name: payload.issuer.name,
    issuer_regime: extractCode(payload.issuer.regime, 10),
    issuer_zip_code: extractCode(payload.issuer.zipCode, 5),
    receiver_rfc: payload.receiver.rfc,
    receiver_name: payload.receiver.name || null,
    receiver_regime: extractCode(payload.receiver.regime, 10),
    receiver_zip_code: extractCode(payload.receiver.zipCode, 5),
    cfdi_use: extractCode(payload.receiver.cfdiUse, 10),
    payment_method: payload.payment.method,
    payment_form: extractCode(payload.payment.form, 10),
    payment_conditions: payload.payment.conditions || null,
    subtotal: payload.financial.subtotal || 0,
    total_tax: payload.financial.totalTax || 0,
    retention_iva: payload.financial.retentionIva || 0,
    retention_iva_rate: payload.financial.retentionIvaRate || 0,
    retention_isr: payload.financial.retentionIsr || 0,
    retention_isr_rate: payload.financial.retentionIsrRate || 0,
    total_amount: payload.financial.totalAmount,
    currency: payload.financial.currency || 'MXN',
    exchange_rate: payload.financial.exchangeRate || 1,
    payment_week: payload.week || null,
    payment_year: invoiceYear,
    contact_email: payload.contact.email || null,
    contact_phone: payload.contact.phone || null,
    status: 'pending_review'
  };
  
  // Try inserting with Pronto Pago fields first
  const prontoPagoFields = {
    payment_program: payload.paymentProgram?.program || 'standard',
    pronto_pago_fee_rate: payload.paymentProgram?.feeRate || 0,
    pronto_pago_fee_amount: payload.paymentProgram?.feeAmount || 0,
    net_payment_amount: payload.paymentProgram?.netAmount || payload.financial.totalAmount,
  };
  
  // First attempt: with Pronto Pago fields
  let result = await client
    .from('invoices')
    .insert({ ...invoiceData, ...prontoPagoFields })
    .select()
    .single();
  
  // If error contains "column" reference, retry without Pronto Pago fields
  if (result.error && result.error.message.includes('column')) {
    console.warn('⚠️ Pronto Pago columns not found, inserting without them');
    console.warn('   Run migration 003_add_pronto_pago.sql to enable this feature');
    
    result = await client
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single();
  }
  
  if (result.error) {
    throw new Error(`Failed to insert invoice: ${result.error.message}`);
  }
  
  return result.data as DbInvoice;
};

/**
 * Insert invoice line items
 */
export const insertInvoiceItems = async (
  invoiceId: string, 
  items: InvoiceItem[]
): Promise<void> => {
  if (!items || items.length === 0) return;
  
  const client = getSupabaseClient();
  
  const itemsData = items.map((item, index) => ({
    invoice_id: invoiceId,
    description: item.description || 'Sin descripción',
    quantity: item.quantity || 1,
    unit: item.unit || null,
    unit_price: item.unitPrice || 0,
    amount: item.amount || 0,
    product_key: item.productKey || null,
    tax_object: item.taxObject || null,
    line_number: index + 1
  }));
  
  const { error } = await client
    .from('invoice_items')
    .insert(itemsData);
  
  if (error) {
    throw new Error(`Failed to insert invoice items: ${error.message}`);
  }
};

/**
 * Save file references to database
 */
export const saveFileRecord = async (
  invoiceId: string,
  fileType: 'xml' | 'pdf',
  fileName: string,
  driveUrl: string,
  driveId: string
): Promise<void> => {
  const client = getSupabaseClient();
  
  console.log(`📁 Saving file record: ${fileType} for invoice ${invoiceId}`);
  console.log(`   - fileName: ${fileName}`);
  console.log(`   - driveId: ${driveId}`);
  console.log(`   - driveUrl: ${driveUrl}`);
  
  // Use only columns that exist in the table
  const fileData = {
    invoice_id: invoiceId,
    file_type: fileType,
    file_name: fileName,
    file_path: driveUrl,
  };
  
  const { data, error } = await client
    .from('invoice_files')
    .insert(fileData)
    .select()
    .single();
  
  if (error) {
    console.error(`❌ Failed to save file record: ${error.message}`);
    console.error(`   Error details:`, JSON.stringify(error, null, 2));
    throw new Error(`Failed to save file record: ${error.message}`);
  }
  
  console.log(`✅ File record saved with ID: ${data?.id}`);
};

/**
 * Get all flotilleros
 */
export const getFlotilleros = async (): Promise<DbFlotillero[]> => {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('flotilleros')
    .select('*')
    .eq('status', 'active')
    .order('fiscal_name');
  
  if (error) {
    throw new Error(`Failed to get flotilleros: ${error.message}`);
  }
  
  return data as DbFlotillero[];
};

/**
 * Get drivers by flotillero
 */
export const getDriversByFlotillero = async (flotilleroId: string): Promise<DbDriver[]> => {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('drivers')
    .select('*')
    .eq('flotillero_id', flotilleroId)
    .eq('status', 'active')
    .order('first_name');
  
  if (error) {
    throw new Error(`Failed to get drivers: ${error.message}`);
  }
  
  return data as DbDriver[];
};
