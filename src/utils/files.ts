/**
 * Convert a File object to Base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Convert a File object to a part for Gemini API
 */
export const fileToPart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  const base64 = await fileToBase64(file);
  return {
    inlineData: {
      data: base64,
      mimeType: file.type,
    },
  };
};

/**
 * Get file size in a human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
