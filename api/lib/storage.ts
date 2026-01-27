import { getSupabaseClient } from './supabase.js';

const BUCKET_NAME = 'invoices';

/**
 * Initialize the storage bucket if it doesn't exist
 */
export const ensureBucketExists = async (): Promise<void> => {
  const client = getSupabaseClient();
  
  // Check if bucket exists
  const { data: buckets } = await client.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
  
  if (!bucketExists) {
    console.log('📦 Creating storage bucket:', BUCKET_NAME);
    const { error } = await client.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['application/xml', 'application/pdf', 'text/xml']
    });
    
    if (error && !error.message.includes('already exists')) {
      console.error('❌ Failed to create bucket:', error.message);
      throw error;
    }
  }
};

/**
 * Build the storage path for an invoice file
 * Structure: year/week/project/rfc/uuid.ext
 */
export const buildStoragePath = (
  year: number,
  week: number,
  project: string,
  issuerRfc: string,
  uuid: string,
  fileType: 'xml' | 'pdf'
): string => {
  const sanitize = (str: string): string => {
    return str.replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase();
  };
  
  const weekStr = String(week).padStart(2, '0');
  const projectStr = sanitize(project);
  const rfcStr = sanitize(issuerRfc);
  
  return `${year}/S${weekStr}/${projectStr}/${rfcStr}/${uuid}.${fileType}`;
};

/**
 * Upload a file to Supabase Storage
 */
export const uploadToStorage = async (
  path: string,
  base64Content: string,
  mimeType: string
): Promise<{ path: string; publicUrl: string }> => {
  const client = getSupabaseClient();
  
  // Ensure bucket exists
  await ensureBucketExists();
  
  // Convert Base64 to Buffer
  const buffer = Buffer.from(base64Content, 'base64');
  
  console.log(`📤 Uploading to Supabase Storage: ${path} (${buffer.length} bytes)`);
  
  // Upload file
  const { data, error } = await client.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: true // Overwrite if exists
    });
  
  if (error) {
    console.error('❌ Storage upload error:', error.message);
    throw new Error(`Failed to upload to storage: ${error.message}`);
  }
  
  // Get public URL (or signed URL for private buckets)
  const { data: urlData } = client.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);
  
  console.log(`✅ Uploaded to Storage: ${data.path}`);
  
  return {
    path: data.path,
    publicUrl: urlData.publicUrl
  };
};

/**
 * Upload invoice files to Supabase Storage
 */
export const uploadInvoiceToStorage = async (
  week: number,
  year: number,
  project: string,
  issuerRfc: string,
  uuid: string,
  xmlContent?: string | null,
  pdfContent?: string | null
): Promise<{
  xmlFile?: { path: string; publicUrl: string };
  pdfFile?: { path: string; publicUrl: string };
}> => {
  const result: {
    xmlFile?: { path: string; publicUrl: string };
    pdfFile?: { path: string; publicUrl: string };
  } = {};
  
  // Upload XML
  if (xmlContent) {
    const xmlPath = buildStoragePath(year, week, project, issuerRfc, uuid, 'xml');
    result.xmlFile = await uploadToStorage(xmlPath, xmlContent, 'application/xml');
  }
  
  // Upload PDF
  if (pdfContent) {
    const pdfPath = buildStoragePath(year, week, project, issuerRfc, uuid, 'pdf');
    result.pdfFile = await uploadToStorage(pdfPath, pdfContent, 'application/pdf');
  }
  
  return result;
};

/**
 * Get a signed URL for private file access
 */
export const getSignedUrl = async (
  path: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> => {
  const client = getSupabaseClient();
  
  const { data, error } = await client.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn);
  
  if (error) {
    throw new Error(`Failed to get signed URL: ${error.message}`);
  }
  
  return data.signedUrl;
};
