/**
 * Review Service
 * Handles database operations for reviews and review presentation data.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type Review = Database['public']['Tables']['reviews']['Row'];
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert'];

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
  distribution: number[]; // index 0 => 1 star, index 4 => 5 stars
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

  const buyerName =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    'Anonymous Buyer';

  const buyerAvatar =
    asNonEmptyString(buyer?.avatar_url) ||
    buildFallbackAvatar(buyerName);

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
    productName:
      asNonEmptyString(orderItem?.product_name) ||
      asNonEmptyString(product?.name) ||
      'Product',
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

const buildReviewStatsFromRatings = (
  ratings: number[],
  withImages: number = 0,
): ReviewStats => {
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
  private mockReviews: Review[] = [];

  /**
   * Create a new review
   */
  async createReview(reviewData: ReviewInsert): Promise<Review | null> {
    if (!isSupabaseConfigured()) {
      const newReview = {
        ...reviewData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        helpful_count: 0,
        is_hidden: false,
        is_edited: false,
      } as Review;
      this.mockReviews.push(newReview);
      return newReview;
    }

    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert(reviewData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating review:', error);
      throw new Error('Failed to submit review');
    }
  }

  /**
   * Get reviews for a specific product
   */
  async getProductReviews(
    productId: string,
    page: number = 1,
    limit: number = 5,
  ): Promise<ProductReviewsResult> {
    if (!isSupabaseConfigured()) {
      const productReviews = this.mockReviews
        .filter((review) => review.product_id === productId && !review.is_hidden)
        .sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

      const start = (page - 1) * limit;
      const pagedReviews = productReviews.slice(start, start + limit).map((review) =>
        mapReviewRowToFeedItem(review),
      );

      return {
        reviews: pagedReviews,
        total: productReviews.length,
        stats: computeReviewStats(productReviews.map((review) => mapReviewRowToFeedItem(review))),
      };
    }

    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
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
          { count: 'exact' },
        )
        .eq('product_id', productId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.warn('Error fetching product reviews:', error);
        return { reviews: [], total: 0, stats: EMPTY_REVIEW_STATS };
      }

      const { data: statsRows, error: statsError } = await supabase
        .from('reviews')
        .select(
          `
            rating,
            review_images (
              id
            )
          `,
        )
        .eq('product_id', productId)
        .eq('is_hidden', false);

      if (statsError) {
        console.warn('Error fetching product review stats:', statsError);
      }

      const mappedReviews = (data || []).map((review) => mapReviewRowToFeedItem(review));

      const ratings = Array.isArray(statsRows)
        ? statsRows.map((row: any) => Number(row.rating || 0))
        : [];
      const withImages = Array.isArray(statsRows)
        ? statsRows.filter((row: any) =>
            Array.isArray(row.review_images) && row.review_images.length > 0,
          ).length
        : 0;

      const computedStats = buildReviewStatsFromRatings(ratings, withImages);
      const fallbackStats = computeReviewStats(mappedReviews);
      const total = count ?? computedStats.total;
      const resolvedStats =
        computedStats.total > 0 ? computedStats : fallbackStats;

      return {
        reviews: mappedReviews,
        total,
        stats: {
          ...resolvedStats,
          total,
          averageRating: total > 0 ? resolvedStats.averageRating : 0,
        },
      };
    } catch (error) {
      console.error('Error fetching product reviews:', error);
      return { reviews: [], total: 0, stats: EMPTY_REVIEW_STATS };
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

      return data || [];
    } catch (error) {
      console.error('Error fetching buyer reviews:', error);
      throw new Error('Failed to fetch your reviews');
    }
  }

  /**
   * Get reviews for a seller's products (Storefront)
   */
  async getSellerReviews(sellerId: string): Promise<ReviewFeedItem[]> {
    if (!isSupabaseConfigured()) {
      return this.mockReviews.map((review) => mapReviewRowToFeedItem(review));
    }

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
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
        `)
        .eq('is_hidden', false)
        .eq('product.seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching seller reviews:', error);
        return [];
      }

      return (data || []).map((review) => mapReviewRowToFeedItem(review));
    } catch (error) {
      console.error('Error fetching seller reviews:', error);
      throw new Error('Failed to fetch store reviews');
    }
  }

  /**
   * Check if a buyer has already reviewed a specific product in an order
   */
  async hasReviewForProduct(
    orderId: string,
    productId: string,
    buyerId?: string,
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return this.mockReviews.some((review) =>
        review.order_id === orderId &&
        review.product_id === productId &&
        (!buyerId || review.buyer_id === buyerId),
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
      console.error('Error checking review existence:', error);
      throw new Error('Failed to check review status');
    }
  }
}

export const reviewService = new ReviewService();
