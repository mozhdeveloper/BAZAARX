/**
 * Review Service
 * Handles database operations for reviews and review presentation data.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { notificationService } from './notificationService';

export interface Review {
  id: string;
  product_id: string;
  buyer_id: string;
  order_id: string | null;
  order_item_id: string | null;
  variant_snapshot: Record<string, unknown> | null;
  rating: number;
  comment: string | null;
  helpful_count: number;
  seller_reply: Record<string, unknown> | null;
  is_verified_purchase: boolean;
  is_hidden: boolean;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  // Images from review_images table (populated separately if needed)
  images?: string[];
  has_voted_helpful?: boolean;
}

export interface ReviewInsert {
  product_id: string;
  buyer_id: string;
  order_id: string;
  order_item_id?: string | null;
  variant_snapshot?: Record<string, unknown> | null;
  rating: number;
  comment?: string | null;
  is_verified_purchase?: boolean;
  helpful_count?: number;
  seller_reply?: Record<string, unknown> | null;
  is_hidden?: boolean;
  is_edited?: boolean;
  images?: string[];
}

export interface ReviewReplySummary {
  message: string;
  repliedAt: string | null;
}

export interface ReviewFeedItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  buyerId: string;
  buyerName: string;
  buyerAvatar: string;
  rating: number;
  comment: string;
  helpfulCount: number;
  images: string[];
  createdAt: string;
  verifiedPurchase: boolean;
  variantLabel: string | null;
  variantSnapshot: Record<string, unknown> | null;
  sellerReply: ReviewReplySummary | null;
}

export interface ReviewStats {
  total: number;
  averageRating: number;
  distribution: number[];
  withImages: number;
}

export interface ProductReviewsResult {
  reviews: ReviewFeedItem[];
  total: number;
  stats: ReviewStats;
}

const EMPTY_REVIEW_STATS: ReviewStats = {
  total: 0,
  averageRating: 0,
  distribution: [0, 0, 0, 0, 0],
  withImages: 0,
};

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isHttpUrl = (value: unknown): value is string =>
  typeof value === 'string' && /^https?:\/\//i.test(value.trim());

const firstRelationRow = <T>(value: T | T[] | null | undefined): T | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value ?? undefined;
};

const buildFallbackAvatar = (displayName: string): string =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=FF6A00&color=fff`;

const mapReviewImages = (review: any): string[] => {
  const joinedImages = Array.isArray(review?.review_images) ? review.review_images : [];

  return joinedImages
    .slice()
    .sort((a: any, b: any) => Number(a?.sort_order || 0) - Number(b?.sort_order || 0))
    .map((image: any) => image?.image_url)
    .filter(isHttpUrl);
};

const pickProductImage = (review: any): string | null => {
  const orderItem = firstRelationRow(review?.order_item);
  const orderVariant = firstRelationRow(orderItem?.variant);
  const product = firstRelationRow(review?.product);
  const productImages = Array.isArray(product?.images) ? product.images : [];

  const orderedProductImages = productImages
    .slice()
    .sort((a: any, b: any) => {
      const primaryA = a?.is_primary ? 0 : 1;
      const primaryB = b?.is_primary ? 0 : 1;
      if (primaryA !== primaryB) {
        return primaryA - primaryB;
      }
      return Number(a?.sort_order || 0) - Number(b?.sort_order || 0);
    })
    .map((image: any) => image?.image_url)
    .filter(isHttpUrl);

  return (
    asNonEmptyString(orderItem?.primary_image_url) ||
    asNonEmptyString(orderVariant?.thumbnail_url) ||
    orderedProductImages[0] ||
    null
  );
};

const parseSellerReply = (sellerReply: unknown): ReviewReplySummary | null => {
  if (!sellerReply) {
    return null;
  }

  if (typeof sellerReply === 'string') {
    const message = asNonEmptyString(sellerReply);
    return message ? { message, repliedAt: null } : null;
  }

  if (typeof sellerReply !== 'object' || Array.isArray(sellerReply)) {
    return null;
  }

  const payload = sellerReply as Record<string, unknown>;
  const message =
    asNonEmptyString(payload.message) ||
    asNonEmptyString(payload.reply) ||
    asNonEmptyString(payload.comment) ||
    asNonEmptyString(payload.text);

  if (!message) {
    return null;
  }

  const repliedAt =
    asNonEmptyString(payload.replied_at) ||
    asNonEmptyString(payload.repliedAt) ||
    asNonEmptyString(payload.created_at) ||
    null;

  return {
    message,
    repliedAt,
  };
};

const resolveVariantLabel = (review: any): string | null => {
  const snapshot =
    review?.variant_snapshot &&
    typeof review.variant_snapshot === 'object' &&
    !Array.isArray(review.variant_snapshot)
      ? (review.variant_snapshot as Record<string, unknown>)
      : null;

  const orderItem = firstRelationRow(review?.order_item);
  const variant = firstRelationRow(orderItem?.variant);
  const product = firstRelationRow(orderItem?.product) || firstRelationRow(review?.product);

  const variantName =
    asNonEmptyString(snapshot?.variant_name) ||
    asNonEmptyString(snapshot?.name) ||
    asNonEmptyString(variant?.variant_name);

  const option1Value =
    asNonEmptyString(snapshot?.option_1_value) ||
    asNonEmptyString(snapshot?.variant_label_1_value) ||
    asNonEmptyString(variant?.option_1_value) ||
    asNonEmptyString(variant?.size) ||
    asNonEmptyString(orderItem?.personalized_options?.variantLabel1);

  const option2Value =
    asNonEmptyString(snapshot?.option_2_value) ||
    asNonEmptyString(snapshot?.variant_label_2_value) ||
    asNonEmptyString(variant?.option_2_value) ||
    asNonEmptyString(variant?.color) ||
    asNonEmptyString(orderItem?.personalized_options?.variantLabel2);

  const option1Label =
    asNonEmptyString(snapshot?.option_1_label) ||
    asNonEmptyString(snapshot?.variant_label_1) ||
    asNonEmptyString(product?.variant_label_1);

  const option2Label =
    asNonEmptyString(snapshot?.option_2_label) ||
    asNonEmptyString(snapshot?.variant_label_2) ||
    asNonEmptyString(product?.variant_label_2);

  const explicitDisplay = asNonEmptyString(snapshot?.display);
  if (explicitDisplay) {
    return explicitDisplay;
  }

  const parts: string[] = [];

  if (variantName) {
    parts.push(variantName);
  }

  if (option1Value) {
    parts.push(option1Label ? `${option1Label}: ${option1Value}` : option1Value);
  }

  if (option2Value) {
    parts.push(option2Label ? `${option2Label}: ${option2Value}` : option2Value);
  }

  return parts.length > 0 ? parts.join(' / ') : null;
};

const mapReviewRowToFeedItem = (review: any): ReviewFeedItem => {
  const buyer = firstRelationRow(review?.buyer);
  const profile = firstRelationRow(buyer?.profile);
  const firstName = asNonEmptyString(profile?.first_name);
  const lastName = asNonEmptyString(profile?.last_name);

  const buyerName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Anonymous Buyer';

  const buyerAvatar = asNonEmptyString(buyer?.avatar_url) || buildFallbackAvatar(buyerName);

  const product = firstRelationRow(review?.product);
  const orderItem = firstRelationRow(review?.order_item);

  const variantSnapshot =
    review?.variant_snapshot &&
    typeof review.variant_snapshot === 'object' &&
    !Array.isArray(review.variant_snapshot)
      ? (review.variant_snapshot as Record<string, unknown>)
      : null;

  return {
    id: review.id,
    productId: review.product_id,
    productName: asNonEmptyString(orderItem?.product_name) || asNonEmptyString(product?.name) || 'Product',
    productImage: pickProductImage(review),
    buyerId: review.buyer_id,
    buyerName,
    buyerAvatar,
    rating: Number(review.rating || 0),
    comment: asNonEmptyString(review.comment) || '',
    helpfulCount: Number(review.helpful_count || 0),
    images: mapReviewImages(review),
    createdAt: review.created_at,
    verifiedPurchase: Boolean(review.is_verified_purchase),
    variantLabel: resolveVariantLabel(review),
    variantSnapshot,
    sellerReply: parseSellerReply(review.seller_reply),
  };
};

const buildReviewStatsFromRatings = (ratings: number[], withImages = 0): ReviewStats => {
  if (!Array.isArray(ratings) || ratings.length === 0) {
    return EMPTY_REVIEW_STATS;
  }

  const distribution = [0, 0, 0, 0, 0];
  let total = 0;
  let weightedSum = 0;

  ratings.forEach((rating) => {
    const normalized = Math.round(Number(rating));
    if (normalized < 1 || normalized > 5) {
      return;
    }

    distribution[normalized - 1] += 1;
    total += 1;
    weightedSum += normalized;
  });

  if (total === 0) {
    return EMPTY_REVIEW_STATS;
  }

  return {
    total,
    averageRating: Number((weightedSum / total).toFixed(1)),
    distribution,
    withImages,
  };
};

export const computeReviewStats = (reviews: ReviewFeedItem[]): ReviewStats => {
  const ratings = reviews.map((review) => Number(review.rating || 0));
  const withImages = reviews.filter((review) => review.images.length > 0).length;
  return buildReviewStatsFromRatings(ratings, withImages);
};

export class ReviewService {
  private static instance: ReviewService;
  private mockReviews: Review[] = [];

  private constructor() {}

  public static getInstance(): ReviewService {
    if (!ReviewService.instance) {
      ReviewService.instance = new ReviewService();
    }
    return ReviewService.instance;
  }

  /**
   * Create a new review
   */
  async createReview(reviewData: ReviewInsert): Promise<Review | null> {
    if (!isSupabaseConfigured()) {
      const newReview: Review = {
        id: crypto.randomUUID(),
        product_id: reviewData.product_id,
        buyer_id: reviewData.buyer_id,
        order_id: reviewData.order_id,
        order_item_id: reviewData.order_item_id || null,
        variant_snapshot: reviewData.variant_snapshot || null,
        rating: reviewData.rating,
        comment: reviewData.comment || null,
        helpful_count: 0,
        seller_reply: null,
        is_verified_purchase: reviewData.is_verified_purchase ?? true,
        is_hidden: false,
        is_edited: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.mockReviews.push(newReview);
      return newReview;
    }

    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          product_id: reviewData.product_id,
          buyer_id: reviewData.buyer_id,
          order_id: reviewData.order_id,
          order_item_id: reviewData.order_item_id || null,
          variant_snapshot: reviewData.variant_snapshot || null,
          rating: reviewData.rating,
          comment: reviewData.comment || null,
          is_verified_purchase: reviewData.is_verified_purchase ?? true,
          helpful_count: reviewData.helpful_count ?? 0,
          seller_reply: reviewData.seller_reply ?? null,
          is_hidden: reviewData.is_hidden ?? false,
          is_edited: reviewData.is_edited ?? false,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as Review;
    } catch (error) {
      console.error('[ReviewService] Error creating review:', error);
      throw new Error('Failed to submit review');
    }
  }

  /**
   * Create a review and upload image attachments
   */
  async submitReviewWithImages(reviewData: ReviewInsert, imageUris: string[] = []): Promise<Review | null> {
      const review = await this.createReview({
          ...reviewData,
          images: []
      });

      if (!review || imageUris.length === 0) {
          // Still notify seller even if no images
          this._notifySellerAboutReview(review, reviewData).catch(() => {});
          return review;
      }

      const uploadedUrls = await this.uploadReviewImages(review.id, imageUris);
      if (uploadedUrls.length === 0) {
          this._notifySellerAboutReview(review, reviewData).catch(() => {});
          return review;
      }

      await this.attachImagesToReview(review.id, uploadedUrls);

      // Notify seller about the new review
      this._notifySellerAboutReview(review, reviewData).catch(() => {});

      return {
          ...review,
          images: uploadedUrls,
      };
  }

  /**
   * Internal: Notify the product seller about a new review
   */
  private async _notifySellerAboutReview(review: Review | null, reviewData: ReviewInsert): Promise<void> {
    if (!review || !isSupabaseConfigured()) return;
    try {
      const { data: product } = await supabase
        .from('products')
        .select('seller_id, name')
        .eq('id', review.product_id)
        .single();

      if (!product?.seller_id) return;

      const { data: buyer } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', review.buyer_id)
        .single();

      const buyerName = buyer ? `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim() || 'A buyer' : 'A buyer';

      await notificationService.notifySellerNewReview({
        sellerId: product.seller_id,
        productId: review.product_id,
        productName: product.name || 'a product',
        rating: review.rating,
        buyerName,
      });
    } catch (err) {
      console.error('[ReviewService] Failed to notify seller about review:', err);
    }
  }

  /**
   * Get reviews for a specific product
   */
  async getProductReviews(
    productId: string, 
    page = 1, 
    limit = 5,
    filters?: { rating?: number; withImages?: boolean; variantId?: string }
  ): Promise<ProductReviewsResult> {
    if (!isSupabaseConfigured()) {
       // Mock implementation for development
       let productReviews = this.mockReviews
        .filter((review) => review.product_id === productId && !review.is_hidden)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Apply Mock Filters
      if (filters?.rating) {
        productReviews = productReviews.filter(r => Math.round(r.rating) === filters.rating);
      }

      const start = (page - 1) * limit;
      const pagedReviews = productReviews
        .slice(start, start + limit)
        .map((review) => mapReviewRowToFeedItem(review));

      return {
        reviews: pagedReviews,
        total: productReviews.length,
        stats: computeReviewStats(productReviews.map((review) => mapReviewRowToFeedItem(review))),
      };
    }

    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Determine strict filtering mode
      const isRatingSelected = filters?.rating !== undefined;
      const isWithImagesSelected = filters?.withImages === true;
      const shouldExcludeImages = isRatingSelected && !isWithImagesSelected;

      // Start building the query
      let query = supabase
        .from('reviews')
        .select(
          `
            id,
            product_id,
            buyer_id,
            order_id,
            order_item_id,
            variant_snapshot,
            rating,
            comment,
            helpful_count,
            seller_reply,
            is_verified_purchase,
            is_hidden,
            is_edited,
            created_at,
            updated_at,
            review_images${isWithImagesSelected ? '!inner' : ''} (
               id,
               image_url,
               sort_order,
               uploaded_at
            ),
            buyer:buyers!reviews_buyer_id_fkey (
              id,
              avatar_url,
              profile:profiles!id (
                *
              )
            ),
            order_item:order_items!reviews_order_item_id_fkey${filters?.variantId ? '!inner' : ''} (
              id,
              product_name,
              primary_image_url,
              variant_id,
              personalized_options,
              variant:product_variants!order_items_variant_id_fkey (
                id,
                variant_name,
                sku,
                size,
                color,
                option_1_value,
                option_2_value,
                thumbnail_url
              ),
              product:products!order_items_product_id_fkey (
                id,
                name,
                variant_label_1,
                variant_label_2
              )
            ),
            product:products!reviews_product_id_fkey (
              id,
              name,
              variant_label_1,
              variant_label_2,
              images:product_images (
                image_url,
                sort_order,
                is_primary
              )
            )
          `,
          { count: 'exact' }
        )
        .eq('product_id', productId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .range(from, to);

      // Apply Filters
      if (filters?.rating) {
        const r = filters.rating;
        query = query.gte('rating', r).lt('rating', r + 1);
      }
      
      // Filter by Variant
      if (filters?.variantId) {
        query = query.eq('order_item.variant_id', filters.variantId);
      }
       
      // Executing the query
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Error fetching reviews:', error);
        throw error;
      }

      // Filter out reviews with images in memory if strict filtering is enabled
      let filteredData = data;
      if (shouldExcludeImages) {
        filteredData = data.filter((r: any) => !r.review_images || r.review_images.length === 0);
      }

      // Fetch Stats
      const { data: statsRows } = await supabase
        .from('reviews')
        .select('rating, review_images(id)')
        .eq('product_id', productId)
        .eq('is_hidden', false);
        
      const ratings = (statsRows || []).map((row: any) => Number(row.rating || 0));
      const withImagesCount = (statsRows || []).filter((row: any) => row.review_images?.length > 0).length;
      
      const computedStats = buildReviewStatsFromRatings(ratings, withImagesCount);
      
      return {
        reviews: (filteredData || []).map((row) => mapReviewRowToFeedItem(row)),
        total: count || 0,
        stats: {
             ...computedStats,
             total: count || computedStats.total
        },
      };
    } catch (error) {
      console.error('[ReviewService] Error fetching product reviews:', error);
      return { reviews: [], total: 0, stats: { averageRating: 0, total: 0, distribution: [0, 0, 0, 0, 0], withImages: 0 } };
    }
  }

  /**
   * Get reviews created by a specific buyer (My Reviews)
   */
  async getBuyerReviews(buyerId: string): Promise<Review[]> {
    if (!isSupabaseConfigured()) {
      return this.mockReviews.filter((review) => review.buyer_id === buyerId);
    }

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          product:products!reviews_product_id_fkey (
            name
          ),
          review_images (
            id,
            image_url,
            sort_order,
            uploaded_at
          )
        `)
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []) as Review[];
    } catch (error) {
      console.error('[ReviewService] Error fetching buyer reviews:', error);
      throw new Error('Failed to fetch your reviews');
    }
  }

  /**
   * Get reviews for a seller's products
   */
  async getSellerReviews(sellerId: string): Promise<ReviewFeedItem[]> {
    if (!isSupabaseConfigured()) {
      return this.mockReviews.map((review) => mapReviewRowToFeedItem(review));
    }

    try {
      const { data: sellerProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', sellerId);

      if (productsError) {
        console.warn('[ReviewService] Error fetching seller products:', productsError);
        return [];
      }

      if (!sellerProducts || sellerProducts.length === 0) {
        return [];
      }

      const productIds = sellerProducts.map((p) => p.id);

      const { data, error } = await supabase
        .from('reviews')
        .select(
          `
            id,
            product_id,
            buyer_id,
            order_id,
            order_item_id,
            variant_snapshot,
            rating,
            comment,
            helpful_count,
            seller_reply,
            is_verified_purchase,
            is_hidden,
            is_edited,
            created_at,
            updated_at,
            review_images (
              id,
              image_url,
              sort_order,
              uploaded_at
            ),
            buyer:buyers!reviews_buyer_id_fkey (
              id,
              avatar_url,
              profile:profiles!id (
                *
              )
            ),
            order_item:order_items!reviews_order_item_id_fkey (
              id,
              product_name,
              primary_image_url,
              variant_id,
              personalized_options,
              variant:product_variants!order_items_variant_id_fkey (
                id,
                variant_name,
                sku,
                size,
                color,
                option_1_value,
                option_2_value,
                thumbnail_url
              ),
              product:products!order_items_product_id_fkey (
                id,
                name,
                variant_label_1,
                variant_label_2
              )
            ),
            product:products!reviews_product_id_fkey (
              id,
              seller_id,
              name,
              variant_label_1,
              variant_label_2,
              images:product_images (
                image_url,
                sort_order,
                is_primary
              )
            )
          `
        )
        .eq('is_hidden', false)
        .in('product_id', productIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[ReviewService] Error fetching seller reviews:', error);
        return [];
      }

      return (data || []).map((review) => mapReviewRowToFeedItem(review));
    } catch (error) {
      console.error('[ReviewService] Error fetching seller reviews:', error);
      throw new Error('Failed to fetch store reviews');
    }
  }

  /**
   * Check if a buyer has already reviewed a specific order item
   */
  async hasReviewForOrderItem(orderItemId: string, buyerId?: string): Promise<boolean> {
    if (!orderItemId) {
      return false;
    }

    if (!isSupabaseConfigured()) {
      return this.mockReviews.some(
        (review) =>
          review.order_item_id === orderItemId &&
          (!buyerId || review.buyer_id === buyerId)
      );
    }

    try {
      let query = supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('order_item_id', orderItemId);

      if (buyerId) {
        query = query.eq('buyer_id', buyerId);
      }

      const { count, error } = await query;

      if (error) {
        throw error;
      }

      return (count || 0) > 0;
    } catch (error) {
      console.warn('[ReviewService] Error checking order-item review existence:', error);
      return false;
    }
  }

  /**
   * Check if a buyer has already reviewed a specific product in an order
   */
  async hasReviewForProduct(orderId: string, productId: string, buyerId?: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return this.mockReviews.some(
        (review) =>
          review.order_id === orderId &&
          review.product_id === productId &&
          (!buyerId || review.buyer_id === buyerId)
      );
    }

    try {
      let query = supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('order_id', orderId)
        .eq('product_id', productId);

      if (buyerId) {
        query = query.eq('buyer_id', buyerId);
      }

      const { count, error } = await query;

      if (error) {
        throw error;
      }

      return (count || 0) > 0;
    } catch (error) {
      console.error('[ReviewService] Error checking review existence:', error);
      throw new Error('Failed to check review status');
    }
  }

  /**
   * Update order_items rating after submitting a review
   */
  async markItemAsReviewed(orderId: string, productId: string, rating?: number): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      const updateData: any = {};
      if (rating) {
        updateData.rating = rating;
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('order_items')
          .update(updateData)
          .eq('order_id', orderId)
          .eq('product_id', productId);

        if (error) {
          console.warn('[ReviewService] Could not update order_item rating:', error.message);
        }
      }
    } catch (error) {
      console.warn('[ReviewService] Error marking item as reviewed:', error);
    }
  }

  /**
   * Check if all items in an order have been reviewed
   */
  async checkAndUpdateOrderReviewed(_orderId: string): Promise<void> {
    return;
  }

  /**
   * Check if a buyer can vote on a review (not the product seller)
   */
  async canVoteOnReview(reviewId: string, buyerId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return true;
    }

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          product:products!reviews_product_id_fkey (
            seller_id
          )
        `)
        .eq('id', reviewId)
        .single();

      if (error) {
        console.warn('[ReviewService] Error checking vote eligibility:', error);
        return false;
      }

      const product = firstRelationRow(data?.product) as { seller_id: string } | undefined;
      const sellerId = product?.seller_id;

      if (sellerId && sellerId === buyerId) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('[ReviewService] Error checking vote eligibility:', error);
      return false;
    }

  }

  /**
   * Check if a user has voted on a specific review
   */
  async hasUserVoted(reviewId: string, buyerId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('review_votes')
        .select('review_id')
        .eq('review_id', reviewId)
        .eq('buyer_id', buyerId)
        .maybeSingle();

      if (error) {
        console.warn('[ReviewService] Error checking user vote:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('[ReviewService] Error checking user vote:', error);
      return false;
    }
  }

  /**
   * Toggle vote on a review
   */
  async toggleReviewVote(reviewId: string, buyerId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const canVote = await this.canVoteOnReview(reviewId, buyerId);
    if (!canVote) {
      throw new Error('Sellers cannot vote on reviews of their own products');
    }

    try {
      const hasVoted = await this.hasUserVoted(reviewId, buyerId);

      if (hasVoted) {
        const { error } = await supabase
          .from('review_votes')
          .delete()
          .eq('review_id', reviewId)
          .eq('buyer_id', buyerId);

        if (error) throw error;
        return false;
      }

      const { error } = await supabase
        .from('review_votes')
        .insert({
          review_id: reviewId,
          buyer_id: buyerId,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[ReviewService] Error toggling review vote:', error);
      throw new Error('Failed to update vote');
    }
  }

  /**
   * Get list of voters for a review
   */
  async getReviewVoters(
    reviewId: string,
    limit = 20
  ): Promise<{
    voters: Array<{
      buyerId: string;
      username: string;
      avatarUrl: string;
      votedAt: string;
    }>;
    totalCount: number;
  }> {
    if (!isSupabaseConfigured()) {
      return { voters: [], totalCount: 0 };
    }

    try {
      const { count, error: countError } = await supabase
        .from('review_votes')
        .select('*', { count: 'exact', head: true })
        .eq('review_id', reviewId);

      if (countError) {
        console.warn('[ReviewService] Error counting review voters:', countError);
      }

      const totalCount = count || 0;

      const { data, error } = await supabase
        .from('review_votes')
        .select('buyer_id, created_at')
        .eq('review_id', reviewId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('[ReviewService] Error fetching review voters:', error);
        return { voters: [], totalCount };
      }

      const voters = await Promise.all(
        (data || []).map(async (vote: any) => {
          const { data: buyerData } = await supabase
            .from('buyers')
            .select('avatar_url')
            .eq('id', vote.buyer_id)
            .maybeSingle();

          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', vote.buyer_id)
            .maybeSingle();

          const firstName = asNonEmptyString(profileData?.first_name);
          const lastName = asNonEmptyString(profileData?.last_name);
          const username = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Anonymous';
          const avatarUrl = asNonEmptyString(buyerData?.avatar_url) || buildFallbackAvatar(username);

          return {
            buyerId: vote.buyer_id,
            username,
            avatarUrl,
            votedAt: vote.created_at,
          };
        })
      );

      return { voters, totalCount };
    } catch (error) {
      console.error('[ReviewService] Error fetching review voters:', error);
      return { voters: [], totalCount: 0 };
    }
  }

  /**
   * Add or update a seller reply to a review
   */
  async addSellerReply(reviewId: string, sellerId: string, message: string): Promise<ReviewFeedItem | null> {
    if (!isSupabaseConfigured()) {
      const reviewIndex = this.mockReviews.findIndex((r) => r.id === reviewId);
      if (reviewIndex >= 0) {
        const updatedReview = {
          ...this.mockReviews[reviewIndex],
          seller_reply: {
            message,
            replied_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        } as Review;
        this.mockReviews[reviewIndex] = updatedReview;
        return mapReviewRowToFeedItem(updatedReview);
      }
      return null;
    }

    try {
      const { data: reviewBasic, error: reviewBasicError } = await supabase
        .from('reviews')
        .select('product_id')
        .eq('id', reviewId)
        .single();

      if (reviewBasicError || !reviewBasic) {
        throw new Error('Review not found');
      }

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', reviewBasic.product_id)
        .single();

      if (productError || !productData) {
        throw new Error('Product not found for this review');
      }

      if (!productData.seller_id || productData.seller_id !== sellerId) {
        throw new Error('You can only reply to reviews for your own products');
      }

      const sellerReply = {
        message: message.trim(),
        replied_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('reviews')
        .update({
          seller_reply: sellerReply,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .select(
          `
            id,
            product_id,
            buyer_id,
            order_id,
            order_item_id,
            variant_snapshot,
            rating,
            comment,
            helpful_count,
            seller_reply,
            is_verified_purchase,
            is_hidden,
            is_edited,
            created_at,
            updated_at,
            review_images (
              id,
              image_url,
              sort_order,
              uploaded_at
            ),
            buyer:buyers!reviews_buyer_id_fkey (
              id,
              avatar_url,
              profile:profiles!id (
                *
              )
            ),
            order_item:order_items!reviews_order_item_id_fkey (
              id,
              product_name,
              primary_image_url,
              variant_id,
              personalized_options,
              variant:product_variants!order_items_variant_id_fkey (
                id,
                variant_name,
                sku,
                size,
                color,
                option_1_value,
                option_2_value,
                thumbnail_url
              ),
              product:products!order_items_product_id_fkey (
                id,
                name,
                variant_label_1,
                variant_label_2
              )
            ),
            product:products!reviews_product_id_fkey (
              id,
              seller_id,
              name,
              variant_label_1,
              variant_label_2,
              images:product_images (
                image_url,
                sort_order,
                is_primary
              )
            )
          `
        )
        .single();

      if (error) {
        throw new Error('Failed to submit reply');
      }

      return mapReviewRowToFeedItem(data);
    } catch (error) {
      console.error('[ReviewService] Error in addSellerReply:', error);
      throw error;
    }
  }

  /**
   * Delete a seller reply from a review
   */
  async deleteSellerReply(reviewId: string, sellerId: string): Promise<ReviewFeedItem | null> {
    if (!isSupabaseConfigured()) {
      const reviewIndex = this.mockReviews.findIndex((r) => r.id === reviewId);
      if (reviewIndex >= 0) {
        const updatedReview = {
          ...this.mockReviews[reviewIndex],
          seller_reply: null,
          updated_at: new Date().toISOString(),
        } as Review;
        this.mockReviews[reviewIndex] = updatedReview;
        return mapReviewRowToFeedItem(updatedReview);
      }
      return null;
    }

    try {
      const { data: reviewBasic, error: reviewBasicError } = await supabase
        .from('reviews')
        .select('product_id')
        .eq('id', reviewId)
        .single();

      if (reviewBasicError || !reviewBasic) {
        throw new Error('Review not found');
      }

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', reviewBasic.product_id)
        .single();

      if (productError || !productData) {
        throw new Error('Product not found for this review');
      }

      if (!productData.seller_id || productData.seller_id !== sellerId) {
        throw new Error('Unauthorized');
      }

      const { data, error } = await supabase
        .from('reviews')
        .update({
          seller_reply: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .select(
          `
            id,
            product_id,
            buyer_id,
            order_id,
            order_item_id,
            variant_snapshot,
            rating,
            comment,
            helpful_count,
            seller_reply,
            is_verified_purchase,
            is_hidden,
            is_edited,
            created_at,
            updated_at,
            review_images (
              id,
              image_url,
              sort_order,
              uploaded_at
            ),
            buyer:buyers!reviews_buyer_id_fkey (
              id,
              avatar_url,
              profile:profiles!id (
                *
              )
            ),
            order_item:order_items!reviews_order_item_id_fkey (
              id,
              product_name,
              primary_image_url,
              variant_id,
              personalized_options,
              variant:product_variants!order_items_variant_id_fkey (
                id,
                variant_name,
                sku,
                size,
                color,
                option_1_value,
                option_2_value,
                thumbnail_url
              ),
              product:products!order_items_product_id_fkey (
                id,
                name,
                variant_label_1,
                variant_label_2
              )
            ),
            product:products!reviews_product_id_fkey (
              id,
              seller_id,
              name,
              variant_label_1,
              variant_label_2,
              images:product_images (
                image_url,
                sort_order,
                is_primary
              )
            )
          `
        )
        .single();

      if (error) {
        throw new Error('Failed to delete reply');
      }

      return mapReviewRowToFeedItem(data);
    } catch (error) {
      console.error('[ReviewService] Error in deleteSellerReply:', error);
      throw error;
    }
  }


    /**
     * Mark a review as helpful and return latest count
     */
    async markReviewHelpful(reviewId: string, buyerId: string): Promise<{ helpfulCount: number; alreadyVoted: boolean }> {
        if (!isSupabaseConfigured()) {
            return { helpfulCount: 0, alreadyVoted: false };
        }

        try {
            const { error: insertError } = await supabase
                .from('review_votes')
                .insert({
                    review_id: reviewId,
                    buyer_id: buyerId,
                });

            const isDuplicateVote = insertError?.code === '23505';
            if (insertError && !isDuplicateVote) {
                throw insertError;
            }

            const { data: review, error: fetchError } = await supabase
                .from('reviews')
                .select('helpful_count')
                .eq('id', reviewId)
                .single();

            if (fetchError) throw fetchError;

            return {
                helpfulCount: review?.helpful_count || 0,
                alreadyVoted: isDuplicateVote,
            };
        } catch (error) {
            console.error('[ReviewService] Error marking review helpful:', error);
            throw new Error('Failed to update helpful count');
        }
    }

    private async uploadReviewImages(reviewId: string, imageUris: string[]): Promise<string[]> {
        if (!isSupabaseConfigured() || imageUris.length === 0) {
            return imageUris;
        }

        const uploadTasks = imageUris.map(async (uri, index) => {
            try {
                const fileData = await this.readImageAsArrayBuffer(uri);
                const extMatch = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
                const fileExt = (extMatch?.[1] || 'jpg').toLowerCase();
                const fileName = `${reviewId}/${Date.now()}_${index}.${fileExt}`;
                const contentType =
                    fileExt === 'png'
                        ? 'image/png'
                        : fileExt === 'webp'
                            ? 'image/webp'
                            : fileExt === 'heic' || fileExt === 'heif'
                                ? 'image/heic'
                                : 'image/jpeg';

                const { error: uploadError } = await supabase.storage
                    .from('review-images')
                    .upload(fileName, fileData, {
                        contentType,
                        upsert: false,
                    });

                if (uploadError) {
                    throw uploadError;
                }

                const { data } = supabase.storage
                    .from('review-images')
                    .getPublicUrl(fileName);

                return data.publicUrl;
            } catch (error) {
                console.warn('[ReviewService] Failed to upload one review image:', {
                    index,
                    uri,
                    error,
                });
                return null;
            }
        });

        const uploaded = await Promise.all(uploadTasks);
        return uploaded.filter((url): url is string => Boolean(url));
    }

    private async attachImagesToReview(reviewId: string, imageUrls: string[]): Promise<void> {
        if (!imageUrls.length || !isSupabaseConfigured()) return;

        const payload = imageUrls.map((imageUrl, index) => ({
            review_id: reviewId,
            image_url: imageUrl,
            sort_order: index,
        }));

        const { error } = await supabase
            .from('review_images')
            .insert(payload);

        if (!error) {
            return;
        }

        console.warn('[ReviewService] Failed to save to review_images table, trying legacy reviews.images:', error.message);

        const { error: legacyError } = await supabase
            .from('reviews')
            .update({ images: imageUrls } as any)
            .eq('id', reviewId);

        if (legacyError) {
            console.warn('[ReviewService] Failed to save legacy review images:', legacyError.message);
        }
    }

    private async readImageAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
        try {
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            return decode(base64);
        } catch (fileSystemError) {
            console.warn('[ReviewService] FileSystem read failed, trying fetch fallback:', {
                uri,
                fileSystemError,
            });

            const response = await fetch(uri);
            if (!response.ok) {
                throw new Error(`Failed to read image: ${response.status}`);
            }

            return await response.arrayBuffer();
        }
    }

}

export const reviewService = ReviewService.getInstance();
