/**
 * Image Conversion & Sanitization Utilities
 * 
 * Handles:
 * - HEIC/HEIF → JPEG conversion (iOS devices)
 * - File format validation (PNG/JPEG only)
 * - Filename sanitization
 */

/**
 * Check if a file is in HEIC/HEIF format (common on iOS devices)
 */
export function isHeicFile(file: File): boolean {
  const heicTypes = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
  if (heicTypes.includes(file.type.toLowerCase())) return true;
  // Fallback: check file extension (some browsers don't set MIME for HEIC)
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext === 'heic' || ext === 'heif';
}

/**
 * Check if a file is an accepted image format (PNG or JPEG only)
 */
export function isAcceptedImageFormat(file: File): boolean {
  const acceptedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  if (acceptedTypes.includes(file.type.toLowerCase())) return true;
  // Also accept HEIC since we convert it
  if (isHeicFile(file)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext === 'png' || ext === 'jpg' || ext === 'jpeg';
}

/**
 * Convert HEIC/HEIF file to JPEG using Canvas API
 * Falls back to returning original file if conversion fails
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;

  try {
    // Create a blob URL and load into an Image element
    const blobUrl = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load HEIC image'));
      image.src = blobUrl;
    });

    // Draw to canvas and export as JPEG
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    ctx.drawImage(img, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
        'image/jpeg',
        0.92
      );
    });

    URL.revokeObjectURL(blobUrl);

    // Create new File with .jpg extension
    const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([blob], sanitizeFilename(newName), { type: 'image/jpeg' });
  } catch (error) {
    console.warn('[imageConversion] HEIC conversion failed, returning original:', error);
    return file;
  }
}

/**
 * Sanitize a filename: remove special characters, limit length
 */
export function sanitizeFilename(filename: string): string {
  // Extract extension
  const lastDot = filename.lastIndexOf('.');
  const ext = lastDot > 0 ? filename.slice(lastDot) : '';
  const base = lastDot > 0 ? filename.slice(0, lastDot) : filename;

  // Remove non-alphanumeric chars except hyphens and underscores
  const sanitized = base
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 50);

  return (sanitized || 'image') + ext.toLowerCase();
}

/**
 * Validate and prepare an image file for upload
 * Returns the processed file or throws with a user-friendly error message
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  // Check if it's a HEIC file and convert
  if (isHeicFile(file)) {
    const converted = await convertHeicToJpeg(file);
    return converted;
  }

  // Validate format
  if (!isAcceptedImageFormat(file)) {
    throw new Error(`"${file.name}" is not a supported format. Only PNG and JPEG are accepted.`);
  }

  // Validate size (5MB max)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error(`"${file.name}" exceeds 5MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB).`);
  }

  // Sanitize filename
  const sanitized = new File([file], sanitizeFilename(file.name), { type: file.type });
  return sanitized;
}
