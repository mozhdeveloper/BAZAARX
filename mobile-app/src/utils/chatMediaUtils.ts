// Chat media validation — images, videos, and PDF documents (mobile)

export type ChatMediaType = 'image' | 'video' | 'document';

export const CHAT_MEDIA_LIMITS: Record<ChatMediaType, {
  maxSize: number;
  accept: string[];
  label: string;
}> = {
  image: {
    maxSize: 10 * 1024 * 1024, // 10 MB
    accept: ['image/jpeg', 'image/png', 'image/webp'],
    label: 'JPG, PNG, or WEBP',
  },
  video: {
    maxSize: 30 * 1024 * 1024, // 30 MB
    accept: ['video/mp4', 'video/quicktime'],
    label: 'MP4 or MOV',
  },
  document: {
    maxSize: 10 * 1024 * 1024, // 10 MB
    accept: ['application/pdf'],
    label: 'PDF',
  },
};

/** Detect media type from MIME type string */
export function detectMediaType(mimeType: string): ChatMediaType | null {
  for (const [type, limits] of Object.entries(CHAT_MEDIA_LIMITS)) {
    if (limits.accept.includes(mimeType)) return type as ChatMediaType;
  }
  return null;
}

/** Detect media type from file extension */
export function detectMediaTypeFromExtension(ext: string): ChatMediaType | null {
  const lower = ext.toLowerCase().replace(/^\./, '');
  const extMap: Record<string, ChatMediaType> = {
    jpg: 'image', jpeg: 'image', png: 'image', webp: 'image',
    mp4: 'video', mov: 'video',
    pdf: 'document',
  };
  return extMap[lower] || null;
}

/** Map extension to MIME type */
export function getMimeFromExtension(ext: string): string {
  const lower = ext.toLowerCase().replace(/^\./, '');
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    heic: 'image/jpeg', heif: 'image/jpeg',
    mp4: 'video/mp4', mov: 'video/quicktime',
    pdf: 'application/pdf',
  };
  return mimeMap[lower] || 'application/octet-stream';
}

// MIME types that Supabase Storage does NOT accept — map them to safe equivalents.
const UNSUPPORTED_IMAGE_MIMES = new Set(['image/heic', 'image/heif', 'application/octet-stream']);
const UNSUPPORTED_VIDEO_MIMES = new Set(['application/octet-stream']);

/**
 * Normalize a raw MIME type coming from expo-image-picker so it is always
 * accepted by Supabase Storage. iOS devices frequently return `image/heic`
 * or `application/octet-stream` for photos.
 */
export function normalizeMimeType(raw: string, mediaKind: 'image' | 'video'): string {
  const lower = raw.toLowerCase();
  if (mediaKind === 'image' && UNSUPPORTED_IMAGE_MIMES.has(lower)) return 'image/jpeg';
  if (mediaKind === 'video' && UNSUPPORTED_VIDEO_MIMES.has(lower)) return 'video/mp4';
  return lower;
}

/** Media preview text for sidebar */
export const MEDIA_PREVIEW_MAP: Record<string, string> = {
  image: '📷 Photo',
  video: '🎬 Video',
  document: '📄 Document',
};

/** Content placeholders sent as `content` when a media-only message is sent */
export const MEDIA_PLACEHOLDER_MAP: Record<ChatMediaType, string> = {
  image: '[Image]',
  video: '[Video]',
  document: '[Document]',
};

export const ALL_PLACEHOLDERS = ['[Image]', '[Video]', '[Document]'];

/**
 * Extract a human-readable filename from a Supabase storage URL.
 * Strips the timestamp prefix added on upload: "1712345678_report.pdf" → "report.pdf"
 * Decodes percent-encoded characters and strips query strings.
 */
export function extractFileName(url: string, fallback = 'Document.pdf'): string {
  try {
    if (!url) return fallback;
    const raw = decodeURIComponent(url.split('/').pop()?.split('?')[0] || fallback);
    if (!raw || raw === fallback) return fallback;
    const match = raw.match(/^\d+_(.+)$/);
    const name = match ? match[1] : raw;
    return name.trim() || fallback;
  } catch {
    return fallback;
  }
}
