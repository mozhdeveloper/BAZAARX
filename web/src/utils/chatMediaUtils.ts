// Client-side image validation — images only, no HEIC in this release

export const CHAT_IMAGE_LIMITS = {
  maxSize: 10 * 1024 * 1024, // 10 MB
  accept: ['image/jpeg', 'image/png', 'image/webp'],
};

export function validateChatImage(file: File): { valid: boolean; error?: string } {
  if (!CHAT_IMAGE_LIMITS.accept.includes(file.type)) {
    return {
      valid: false,
      error: `"${file.name}" is not supported. Use JPG, PNG, or WEBP.`,
    };
  }
  if (file.size > CHAT_IMAGE_LIMITS.maxSize) {
    return { valid: false, error: `"${file.name}" is too large (max 10 MB).` };
  }
  return { valid: true };
}
