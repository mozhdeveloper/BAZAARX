/**
 * Storage Utilities
 * Helper functions for managing file uploads to Supabase Storage
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Upload a product image
 */
export const uploadProductImage = async (
  file: File,
  sellerId: string,
  productId: string
): Promise<string | null> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured - returning mock URL');
    return `https://via.placeholder.com/400?text=${file.name}`;
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${sellerId}/${productId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('product-images').getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Image upload failed:', error);
    return null;
  }
};

/**
 * Upload multiple product images
 */
export const uploadProductImages = async (
  files: File[],
  sellerId: string,
  productId: string
): Promise<string[]> => {
  const uploadPromises = files.map((file) =>
    uploadProductImage(file, sellerId, productId)
  );
  const results = await Promise.all(uploadPromises);
  return results.filter((url): url is string => url !== null);
};

/**
 * Delete a product image
 */
export const deleteProductImage = async (url: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return true;
  }

  try {
    // Extract path from URL
    const path = url.split('/product-images/')[1];

    const { error } = await supabase.storage
      .from('product-images')
      .remove([path]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Image deletion failed:', error);
    return false;
  }
};

/**
 * Upload profile avatar
 */
export const uploadAvatar = async (
  file: File,
  userId: string
): Promise<string | null> => {
  if (!isSupabaseConfigured()) {
    return `https://ui-avatars.com/api/?name=${userId}`;
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('profile-avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true, // Replace existing avatar
      });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from('profile-avatars').getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Avatar upload failed:', error);
    return null;
  }
};

/**
 * Upload review images
 */
export const uploadReviewImages = async (
  files: File[],
  reviewId: string
): Promise<string[]> => {
  if (!isSupabaseConfigured()) {
    return files.map((f) => `https://via.placeholder.com/300?text=${f.name}`);
  }

  try {
    const uploadPromises = files.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${reviewId}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('review-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from('review-images').getPublicUrl(fileName);

      return publicUrl;
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Review images upload failed:', error);
    return [];
  }
};

/**
 * Upload seller documents (business registration, etc.)
 */
export const uploadSellerDocument = async (
  file: File,
  sellerId: string,
  documentType: string
): Promise<string | null> => {
  if (!isSupabaseConfigured()) {
    return `mock://document/${file.name}`;
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${sellerId}/${documentType}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('seller-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from('seller-documents').getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Document upload failed:', error);
    return null;
  }
};

/**
 * Get file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Validate image file
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'Image size must be less than 5MB' };
  }

  return { valid: true };
};

/**
 * Compress image before upload (basic client-side compression)
 */
export const compressImage = async (
  file: File,
  maxWidth = 1200,
  quality = 0.85
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Canvas to Blob conversion failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};
