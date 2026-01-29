import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

// Google Drive client instance
let driveClient: drive_v3.Drive | null = null;

/**
 * Initialize Google Drive client with Service Account credentials
 * 
 * Uses Domain-Wide Delegation (impersonation) when GOOGLE_IMPERSONATE_EMAIL is set.
 * This allows the Service Account to act on behalf of a real user,
 * using their storage quota instead of the SA's (which is 0).
 * 
 * Setup required in Google Admin Console:
 * 1. Go to Security > API Controls > Domain-wide Delegation
 * 2. Add the Service Account Client ID
 * 3. Add scope: https://www.googleapis.com/auth/drive
 */
export const getDriveClient = (): drive_v3.Drive => {
  if (!driveClient) {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const impersonateEmail = process.env.GOOGLE_IMPERSONATE_EMAIL;
    
    if (!serviceAccountEmail || !privateKey) {
      throw new Error('Missing Google Drive Service Account credentials');
    }
    
    let auth;
    
    if (impersonateEmail) {
      // Use Domain-Wide Delegation (impersonation)
      // Files will be created as the impersonated user, using their quota
      console.log(`🔐 Using Domain-Wide Delegation, impersonating: ${impersonateEmail}`);
      
      auth = new google.auth.JWT({
        email: serviceAccountEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/drive'],
        subject: impersonateEmail, // Impersonate this user
      });
    } else {
      // Standard Service Account auth (may fail with "no storage quota")
      console.log('🔐 Using standard Service Account auth (no impersonation)');
      
      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: serviceAccountEmail,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
    }
    
    driveClient = google.drive({ version: 'v3', auth });
  }
  
  return driveClient;
};

/**
 * Check if Google Drive connection is healthy
 */
export const checkConnection = async (): Promise<boolean> => {
  try {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    
    // Log config status (without revealing secrets)
    console.log('🔍 Google Drive Config Check:');
    console.log('  - GOOGLE_SERVICE_ACCOUNT_EMAIL:', serviceAccountEmail ? `✅ (${serviceAccountEmail})` : '❌ MISSING');
    console.log('  - GOOGLE_PRIVATE_KEY:', privateKey ? `✅ (${privateKey.length} chars)` : '❌ MISSING');
    console.log('  - GOOGLE_DRIVE_ROOT_FOLDER_ID:', rootFolderId ? `✅ (${rootFolderId})` : '❌ MISSING');
    
    if (!rootFolderId) {
      console.error('❌ GOOGLE_DRIVE_ROOT_FOLDER_ID not configured');
      return false;
    }
    
    const drive = getDriveClient();
    
    console.log('📂 Attempting to access root folder...');
    const response = await drive.files.get({
      fileId: rootFolderId,
      fields: 'id,name',
    });
    
    console.log('✅ Google Drive connected! Folder:', response.data.name);
    return !!response.data.id;
  } catch (error) {
    const err = error as Error & { code?: number; errors?: Array<{ message: string; reason: string }> };
    console.error('❌ Google Drive connection failed:');
    console.error('  - Error:', err.message);
    if (err.errors) {
      err.errors.forEach(e => console.error('  - Detail:', e.reason, '-', e.message));
    }
    return false;
  }
};

/**
 * Search for a folder by name within a parent folder
 */
export const findFolder = async (
  folderName: string, 
  parentId: string
): Promise<string | null> => {
  const drive = getDriveClient();
  
  const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentId}' in parents and trashed=false`;
  
  const response = await drive.files.list({
    q: query,
    fields: 'files(id,name)',
    pageSize: 1,
  });
  
  return response.data.files?.[0]?.id || null;
};

/**
 * Create a new folder in Google Drive
 */
export const createFolder = async (
  folderName: string, 
  parentId: string
): Promise<string> => {
  const drive = getDriveClient();
  
  const response = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });
  
  if (!response.data.id) {
    throw new Error(`Failed to create folder: ${folderName}`);
  }
  
  return response.data.id;
};

/**
 * Get or create a folder (find first, create if not exists)
 */
export const getOrCreateFolder = async (
  folderName: string, 
  parentId: string
): Promise<string> => {
  const existingId = await findFolder(folderName, parentId);
  
  if (existingId) {
    return existingId;
  }
  
  return createFolder(folderName, parentId);
};

/**
 * Build the folder structure: Semana -> [Extemporaneas] -> Proyecto -> Facturador
 * Returns the final folder ID where files should be uploaded
 * 
 * @param isLate - If true, adds an "Extemporaneas" subfolder under the week folder
 */
export const buildFolderStructure = async (
  week: number,
  year: number,
  project: string,
  issuerRfc: string,
  issuerName: string,
  isLate: boolean = false
): Promise<{ folderId: string; folderPath: string }> => {
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  
  if (!rootFolderId) {
    throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID not configured');
  }
  
  // Sanitize names for folder creation
  const sanitize = (str: string): string => {
    return str.replace(/[<>:"/\\|?*]/g, '').trim();
  };
  
  // Build folder names
  const weekFolder = `Semana_${String(week).padStart(2, '0')}_${year}`;
  const projectFolder = sanitize(project.toUpperCase().replace(/ /g, '_'));
  const issuerFolder = `${issuerRfc}_${sanitize(issuerName).replace(/ /g, '_')}`;
  
  // Create nested structure
  const weekFolderId = await getOrCreateFolder(weekFolder, rootFolderId);
  
  // If late invoice, add Extemporaneas subfolder
  let parentForProject = weekFolderId;
  let pathPrefix = weekFolder;
  
  if (isLate) {
    const lateFolderId = await getOrCreateFolder('Extemporaneas', weekFolderId);
    parentForProject = lateFolderId;
    pathPrefix = `${weekFolder}/Extemporaneas`;
    console.log('📁 Creating folder in Extemporaneas for late invoice');
  }
  
  const projectFolderId = await getOrCreateFolder(projectFolder, parentForProject);
  const issuerFolderId = await getOrCreateFolder(issuerFolder, projectFolderId);
  
  const folderPath = `${pathPrefix}/${projectFolder}/${issuerFolder}`;
  
  return {
    folderId: issuerFolderId,
    folderPath,
  };
};

/**
 * Upload a file to Google Drive from Base64 content
 */
export const uploadFile = async (
  folderId: string,
  fileName: string,
  base64Content: string,
  mimeType: string
): Promise<{ fileId: string; webViewLink: string }> => {
  const drive = getDriveClient();
  
  // Convert Base64 to Buffer
  const buffer = Buffer.from(base64Content, 'base64');
  
  // Create readable stream from buffer
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id,webViewLink',
  });
  
  if (!response.data.id) {
    throw new Error(`Failed to upload file: ${fileName}`);
  }
  
  // Make file accessible via link
  await drive.permissions.create({
    fileId: response.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });
  
  return {
    fileId: response.data.id,
    webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
  };
};

/**
 * Upload invoice files (XML and PDF) to the appropriate folder
 * @param isLate - If true, files are stored in Extemporaneas subfolder
 */
export const uploadInvoiceFiles = async (
  week: number,
  year: number,
  project: string,
  issuerRfc: string,
  issuerName: string,
  uuid: string,
  xmlContent?: string | null,
  pdfContent?: string | null,
  isLate: boolean = false
): Promise<{
  folderPath: string;
  xmlFile?: { fileId: string; webViewLink: string };
  pdfFile?: { fileId: string; webViewLink: string };
}> => {
  // Build folder structure (with Extemporaneas if late)
  const { folderId, folderPath } = await buildFolderStructure(
    week,
    year,
    project,
    issuerRfc,
    issuerName,
    isLate
  );
  
  const result: {
    folderPath: string;
    xmlFile?: { fileId: string; webViewLink: string };
    pdfFile?: { fileId: string; webViewLink: string };
  } = { folderPath };
  
  // Upload XML if provided
  if (xmlContent) {
    result.xmlFile = await uploadFile(
      folderId,
      `${uuid}.xml`,
      xmlContent,
      'application/xml'
    );
  }
  
  // Upload PDF if provided
  if (pdfContent) {
    result.pdfFile = await uploadFile(
      folderId,
      `${uuid}.pdf`,
      pdfContent,
      'application/pdf'
    );
  }
  
  return result;
};

/**
 * Upload credit note files (XML and PDF) to the same folder as the parent invoice
 * Credit note files are named with _NC suffix (Nota de Crédito)
 * @param isLate - If true, files are stored in Extemporaneas subfolder
 */
export const uploadCreditNoteFiles = async (
  week: number,
  year: number,
  project: string,
  issuerRfc: string,
  issuerName: string,
  invoiceUuid: string, // Parent invoice UUID (for folder context)
  creditNoteUuid: string,
  xmlContent?: string | null,
  pdfContent?: string | null,
  isLate: boolean = false
): Promise<{
  folderPath: string;
  xmlFile?: { fileId: string; webViewLink: string };
  pdfFile?: { fileId: string; webViewLink: string };
}> => {
  // Build folder structure (same as parent invoice)
  const { folderId, folderPath } = await buildFolderStructure(
    week,
    year,
    project,
    issuerRfc,
    issuerName,
    isLate
  );
  
  const result: {
    folderPath: string;
    xmlFile?: { fileId: string; webViewLink: string };
    pdfFile?: { fileId: string; webViewLink: string };
  } = { folderPath };
  
  // Upload XML if provided (with _NC suffix)
  if (xmlContent) {
    result.xmlFile = await uploadFile(
      folderId,
      `${creditNoteUuid}_NC.xml`,
      xmlContent,
      'application/xml'
    );
    console.log(`📄 Credit note XML uploaded: ${creditNoteUuid}_NC.xml`);
  }
  
  // Upload PDF if provided (with _NC suffix)
  if (pdfContent) {
    result.pdfFile = await uploadFile(
      folderId,
      `${creditNoteUuid}_NC.pdf`,
      pdfContent,
      'application/pdf'
    );
    console.log(`📄 Credit note PDF uploaded: ${creditNoteUuid}_NC.pdf`);
  }
  
  return result;
};
