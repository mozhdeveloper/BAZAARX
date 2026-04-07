// Chat media validation — images, videos, and PDF documents

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

/** Detect media type from MIME, or null if unsupported */
export function detectMediaType(file: File): ChatMediaType | null {
  for (const [type, limits] of Object.entries(CHAT_MEDIA_LIMITS)) {
    if (limits.accept.includes(file.type)) return type as ChatMediaType;
  }
  return null;
}

/** Validate file type AND size. Returns mediaType on success. */
export function validateChatMedia(file: File): { valid: boolean; mediaType?: ChatMediaType; error?: string } {
  const mediaType = detectMediaType(file);
  if (!mediaType) {
    return {
      valid: false,
      error: `"${file.name}" is not supported. Accepted: JPG, PNG, WEBP, MP4, MOV, or PDF.`,
    };
  }
  const limits = CHAT_MEDIA_LIMITS[mediaType];
  if (file.size > limits.maxSize) {
    const maxMB = limits.maxSize / (1024 * 1024);
    return { valid: false, error: `"${file.name}" is too large (max ${maxMB} MB for ${limits.label}).` };
  }
  return { valid: true, mediaType };
}

// ── Legacy alias (kept so no imports break during transition) ────────────
export const CHAT_IMAGE_LIMITS = CHAT_MEDIA_LIMITS.image;
export function validateChatImage(file: File): { valid: boolean; error?: string } {
  if (!CHAT_IMAGE_LIMITS.accept.includes(file.type)) {
    return { valid: false, error: `"${file.name}" is not supported. Use ${CHAT_IMAGE_LIMITS.label}.` };
  }
  if (file.size > CHAT_IMAGE_LIMITS.maxSize) {
    return { valid: false, error: `"${file.name}" is too large (max 10 MB).` };
  }
  return { valid: true };
}
