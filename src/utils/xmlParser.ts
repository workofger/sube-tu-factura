/**
 * XML Parser utilities for CFDI invoice processing
 * Extracts key data from XML without requiring AI
 */

/**
 * Extract UUID from CFDI XML content
 * The UUID is in the TimbreFiscalDigital complement
 */
export const extractUuidFromXml = async (xmlFile: File): Promise<string | null> => {
  try {
    const content = await xmlFile.text();
    
    // Try multiple patterns for UUID extraction
    // Pattern 1: tfd:TimbreFiscalDigital UUID attribute
    const tfdPattern = /tfd:TimbreFiscalDigital[^>]*UUID\s*=\s*["']([A-Fa-f0-9-]{36})["']/i;
    let match = content.match(tfdPattern);
    
    if (match) {
      return match[1].toUpperCase();
    }
    
    // Pattern 2: TimbreFiscalDigital without namespace prefix
    const noNsPattern = /TimbreFiscalDigital[^>]*UUID\s*=\s*["']([A-Fa-f0-9-]{36})["']/i;
    match = content.match(noNsPattern);
    
    if (match) {
      return match[1].toUpperCase();
    }
    
    // Pattern 3: Just look for UUID attribute with valid format
    const uuidPattern = /UUID\s*=\s*["']([A-Fa-f0-9-]{36})["']/i;
    match = content.match(uuidPattern);
    
    if (match) {
      return match[1].toUpperCase();
    }
    
    console.warn('UUID not found in XML');
    return null;
  } catch (error) {
    console.error('Error parsing XML:', error);
    return null;
  }
};

/**
 * Extract invoice date from CFDI XML content
 * Returns the Fecha attribute from the Comprobante root element
 */
export const extractDateFromXml = async (xmlFile: File): Promise<string | null> => {
  try {
    const content = await xmlFile.text();
    
    // Pattern: Fecha attribute in Comprobante element
    // Format: Fecha="2026-01-15T10:30:00"
    const datePattern = /Comprobante[^>]*Fecha\s*=\s*["']([^"']+)["']/i;
    const match = content.match(datePattern);
    
    if (match) {
      // Return just the date part (YYYY-MM-DD)
      return match[1].split('T')[0];
    }
    
    // Alternative: FechaTimbrado in TimbreFiscalDigital
    const timbradoPattern = /FechaTimbrado\s*=\s*["']([^"']+)["']/i;
    const timbradoMatch = content.match(timbradoPattern);
    
    if (timbradoMatch) {
      return timbradoMatch[1].split('T')[0];
    }
    
    console.warn('Date not found in XML');
    return null;
  } catch (error) {
    console.error('Error parsing XML date:', error);
    return null;
  }
};

/**
 * Extract project name from CFDI XML content
 * Searches in Concepto descriptions for known project keywords
 */
export const extractProjectFromXml = async (
  xmlFile: File, 
  knownProjects: string[]
): Promise<string | null> => {
  try {
    const content = await xmlFile.text();
    const contentUpper = content.toUpperCase();
    
    // Look for known project names in the XML content
    for (const project of knownProjects) {
      const projectUpper = project.toUpperCase();
      // Check in Descripcion attributes
      if (contentUpper.includes(projectUpper)) {
        return project;
      }
      // Also check for variations (with underscores, spaces, etc.)
      const variations = [
        projectUpper.replace(/_/g, ' '),
        projectUpper.replace(/ /g, '_'),
        projectUpper.replace(/ /g, ''),
      ];
      for (const variation of variations) {
        if (contentUpper.includes(variation)) {
          return project;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting project from XML:', error);
    return null;
  }
};

/**
 * Get the base filename without extension
 */
export const getFileBaseName = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(0, lastDot) : filename;
};

/**
 * Validate that two files have matching base names
 */
export const validateMatchingFilenames = (
  xmlFile: File | null, 
  pdfFile: File | null
): { valid: boolean; error?: string } => {
  if (!xmlFile || !pdfFile) {
    return { valid: true }; // Can't validate if files not loaded yet
  }
  
  const xmlBaseName = getFileBaseName(xmlFile.name);
  const pdfBaseName = getFileBaseName(pdfFile.name);
  
  if (xmlBaseName.toLowerCase() !== pdfBaseName.toLowerCase()) {
    return {
      valid: false,
      error: `Los archivos deben tener el mismo nombre. XML: "${xmlBaseName}" ≠ PDF: "${pdfBaseName}"`
    };
  }
  
  return { valid: true };
};
