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
  baseProductName: string;
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
    baseProductName:
      asNonEmptyString(product?.name) ||
      asNonEmptyString(orderItem?.product_name) ||
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
    rating?: number,
    withImages: boolean = false,
    variantId?: string,
    sortBy: 'recent' | 'helpful' = 'helpful',
  ): Promise<ProductReviewsResult> {
    if (!isSupabaseConfigured()) {
      let productReviews = this.mockReviews
        .filter((review) => review.product_id === productId && !review.is_hidden)
        .sort((a, b) => {
          if (sortBy === 'helpful') {
            return (b.helpful_count || 0) - (a.helpful_count || 0);
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

      if (rating) {
        productReviews = productReviews.filter((r) => Math.round(r.rating) === rating);
      }

      const start = (page - 1) * limit;
      let mappedReviews = productReviews.map((review) => mapReviewRowToFeedItem(review));

      // Apply photo logic: if not "All" rating and withImages is false, hide photo reviews
      if (rating && !withImages) {
        mappedReviews = mappedReviews.filter(r => r.images.length === 0);
      } else if (withImages) {
        mappedReviews = mappedReviews.filter(r => r.images.length > 0);
      }

      if (variantId) {
        mappedReviews = mappedReviews.filter(r => {
          const snapshot = r.variantSnapshot;
          const reviewVariantId = (snapshot?.variant_id || snapshot?.id) as string | undefined;
          return reviewVariantId === variantId;
        });
      }

      let statsReviews = this.mockReviews
        .filter((review) => review.product_id === productId && !review.is_hidden);

      if (withImages) {
        statsReviews = statsReviews.filter(r => (r as any).review_images?.length > 0 || Array.isArray((r as any).images) && (r as any).images.length > 0);
      }

      if (variantId) {
        statsReviews = statsReviews.filter(r => {
          const snapshot = r.variant_snapshot as any;
          const reviewVariantId = (snapshot?.variant_id || snapshot?.id) as string | undefined;
          return reviewVariantId === variantId;
        });
      }

      const pagedReviews = mappedReviews.slice(start, start + limit);

      return {
        reviews: pagedReviews,
        total: mappedReviews.length,
        stats: computeReviewStats(statsReviews.map((review) => mapReviewRowToFeedItem(review))),
      };
    }

    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

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
        .eq('is_hidden', false);

      if (rating) {
        query = query.eq('rating', rating);
      }

      // If variant filter is active
      if (variantId) {
        // We can check variant_id in joined order_items, or in variant_snapshot
        // postgrest doesn't support complex json filtering easily in simple .eq
        // So we filter by order_item -> variant_id
        query = query.filter('order_item.variant_id', 'eq', variantId);
      }

      const { data, error, count } = await query
        .order(sortBy === 'helpful' ? 'helpful_count' : 'created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching product reviews:', error);
        return { reviews: [], total: 0, stats: EMPTY_REVIEW_STATS };
      }

      // We still want full stats (distribution) even when filtering
      let statsQuery = supabase
        .from('reviews')
        .select(
          `
            rating,
            review_images (
              id
            ),
            order_item:order_items!reviews_order_item_id_fkey (
              variant_id
            )
          `,
        )
        .eq('product_id', productId)
        .eq('is_hidden', false);

      if (variantId) {
        statsQuery = statsQuery.filter('order_item.variant_id', 'eq', variantId);
      }

      const { data: statsRows, error: statsError } = await statsQuery;

      if (statsError) {
        console.warn('Error fetching product review stats:', statsError);
      }

      let mappedReviews = (data || []).map((review) => mapReviewRowToFeedItem(review));

      // Apply the user's specific photo logic
      if (rating && !withImages) {
        // User requested: don't show reviews with photos if photo filter is OFF, but only if a rating is selected
        mappedReviews = mappedReviews.filter(r => r.images.length === 0);
      } else if (withImages) {
        // Standard "with photo" filter
        mappedReviews = mappedReviews.filter(r => r.images.length > 0);
      }

      let filteredStatsRows = statsRows || [];
      if (withImages) {
        filteredStatsRows = filteredStatsRows.filter((row: any) =>
          Array.isArray(row.review_images) && row.review_images.length > 0
        );
      }

      const ratings = filteredStatsRows.map((row: any) => Number(row.rating || 0));
      const withImagesCount = filteredStatsRows.filter((row: any) =>
        Array.isArray(row.review_images) && row.review_images.length > 0,
      ).length;

      const computedStats = buildReviewStatsFromRatings(ratings, withImagesCount);
      const fallbackStats = computeReviewStats(mappedReviews);

      // Handle pagination locally since we might have filtered
      const pagedReviews = mappedReviews.slice(from, to + 1);

      return {
        reviews: pagedReviews,
        total: mappedReviews.length,
        stats: computedStats.total > 0 ? computedStats : fallbackStats,
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
   * Filters reviews by first getting all product IDs for the seller,
   * then fetching reviews for those products only.
   */
  async getSellerReviews(sellerId: string): Promise<ReviewFeedItem[]> {
    if (!isSupabaseConfigured()) {
      return this.mockReviews.map((review) => mapReviewRowToFeedItem(review));
    }

    try {
      // Step 1: Get all product IDs for this seller
      const { data: sellerProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', sellerId);

      if (productsError) {
        console.warn('Error fetching seller products:', productsError);
        return [];
      }

      if (!sellerProducts || sellerProducts.length === 0) {
        console.log('No products found for seller:', sellerId);
        return [];
      }

      const productIds = sellerProducts.map(p => p.id);
      console.log(`Found ${productIds.length} products for seller ${sellerId}`);

      // Step 2: Get reviews for these products only
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
        .in('product_id', productIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching seller reviews:', error);
        return [];
      }

      console.log(`Found ${data?.length || 0} reviews for seller ${sellerId}'s products`);

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

  /**
   * Check if a buyer can vote on a review (not the product seller)
   * Uses Option A: Compare buyer_id with product.seller_id
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
        console.warn('Error checking vote eligibility:', error);
        return false;
      }

      const product = firstRelationRow(data?.product);
      const sellerId = product?.seller_id;

      // Block if buyer is the seller of this product
      if (sellerId && sellerId === buyerId) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking vote eligibility:', error);
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
        console.warn('Error checking user vote:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking user vote:', error);
      return false;
    }
  }

  /**
   * Toggle vote on a review (vote if not voted, unvote if already voted)
   * Returns true if voted, false if unvoted
   */
  async toggleReviewVote(reviewId: string, buyerId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    // Check if user can vote (not seller)
    const canVote = await this.canVoteOnReview(reviewId, buyerId);
    if (!canVote) {
      throw new Error('Sellers cannot vote on reviews of their own products');
    }

    try {
      // Check if already voted
      const hasVoted = await this.hasUserVoted(reviewId, buyerId);

      if (hasVoted) {
        // Remove vote
        const { error } = await supabase
          .from('review_votes')
          .delete()
          .eq('review_id', reviewId)
          .eq('buyer_id', buyerId);

        if (error) {
          throw error;
        }

        return false; // Unvoted
      } else {
        // Add vote
        const { error } = await supabase
          .from('review_votes')
          .insert({
            review_id: reviewId,
            buyer_id: buyerId,
          });

        if (error) {
          throw error;
        }

        return true; // Voted
      }
    } catch (error) {
      console.error('Error toggling review vote:', error);
      throw new Error('Failed to update vote');
    }
  }

  /**
   * Get list of voters for a review (max 20 + count of remaining)
   * Returns voters with their profile info
   */
  async getReviewVoters(
    reviewId: string,
    limit: number = 20,
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
      // Get total count first
      const { count, error: countError } = await supabase
        .from('review_votes')
        .select('*', { count: 'exact', head: true })
        .eq('review_id', reviewId);

      if (countError) {
        console.warn('Error counting review voters:', countError);
      }

      const totalCount = count || 0;

      // Get voters (limited)
      const { data, error } = await supabase
        .from('review_votes')
        .select('buyer_id, created_at')
        .eq('review_id', reviewId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('Error fetching review voters:', error);
        return { voters: [], totalCount };
      }

      // Fetch buyer and profile info for each voter
      const voters = await Promise.all((data || []).map(async (vote: any) => {
        // Get buyer info
        const { data: buyerData } = await supabase
          .from('buyers')
          .select('avatar_url')
          .eq('id', vote.buyer_id)
          .maybeSingle();

        // Get profile info for name
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
      }));

      return { voters, totalCount };
    } catch (error) {
      console.error('Error fetching review voters:', error);
      return { voters: [], totalCount: 0 };
    }
  }

  /**
   * Add or update a seller reply to a review
   * @param reviewId - The review ID to reply to
   * @param sellerId - The seller ID (for authorization)
   * @param message - The reply message
   * @returns The updated review with seller reply
   */
  async addSellerReply(
    reviewId: string,
    sellerId: string,
    message: string,
  ): Promise<ReviewFeedItem | null> {
    if (!isSupabaseConfigured()) {
      // Mock mode - update local mock data
      const reviewIndex = this.mockReviews.findIndex((r) => r.id === reviewId);
      if (reviewIndex >= 0) {
        const updatedReview = {
          ...this.mockReviews[reviewIndex],
          seller_reply: {
            message,
            replied_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        };
        this.mockReviews[reviewIndex] = updatedReview;
        return mapReviewRowToFeedItem(updatedReview);
      }
      return null;
    }

    try {
      // Verify the seller owns the product being reviewed
      // First, get the product_id from the review
      const { data: reviewBasic, error: reviewBasicError } = await supabase
        .from('reviews')
        .select('product_id')
        .eq('id', reviewId)
        .single();

      if (reviewBasicError || !reviewBasic) {
        console.error('Review not found:', reviewBasicError);
        throw new Error('Review not found');
      }

      // Then, get the seller_id from the product directly
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', reviewBasic.product_id)
        .single();

      if (productError || !productData) {
        console.error('Product not found for review:', productError);
        throw new Error('Product not found for this review');
      }

      if (!productData.seller_id) {
        console.error('Product has no seller_id:', reviewBasic.product_id);
        throw new Error('Product has no associated seller');
      }

      if (productData.seller_id !== sellerId) {
        console.error('Seller authorization failed:', {
          productSellerId: productData.seller_id,
          requestingSellerId: sellerId,
          reviewId,
          productId: reviewBasic.product_id
        });
        throw new Error('You can only reply to reviews for your own products');
      }

      // Update the review with seller reply
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
        .single();

      if (error) {
        console.error('Error adding seller reply:', error);
        throw new Error('Failed to submit reply');
      }

      return mapReviewRowToFeedItem(data);
    } catch (error) {
      console.error('Error in addSellerReply:', error);
      throw error;
    }
  }

  /**
   * Delete a seller reply from a review
   * @param reviewId - The review ID
   * @param sellerId - The seller ID (for authorization)
   * @returns The updated review without seller reply
   */
  async deleteSellerReply(
    reviewId: string,
    sellerId: string,
  ): Promise<ReviewFeedItem | null> {
    if (!isSupabaseConfigured()) {
      // Mock mode
      const reviewIndex = this.mockReviews.findIndex((r) => r.id === reviewId);
      if (reviewIndex >= 0) {
        const updatedReview = {
          ...this.mockReviews[reviewIndex],
          seller_reply: null,
          updated_at: new Date().toISOString(),
        };
        this.mockReviews[reviewIndex] = updatedReview;
        return mapReviewRowToFeedItem(updatedReview);
      }
      return null;
    }

    try {
      // Verify ownership using the same approach as addSellerReply
      const { data: reviewBasic, error: reviewBasicError } = await supabase
        .from('reviews')
        .select('product_id')
        .eq('id', reviewId)
        .single();

      if (reviewBasicError || !reviewBasic) {
        console.error('Review not found:', reviewBasicError);
        throw new Error('Review not found');
      }

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', reviewBasic.product_id)
        .single();

      if (productError || !productData) {
        console.error('Product not found for review:', productError);
        throw new Error('Product not found for this review');
      }

      if (!productData.seller_id) {
        console.error('Product has no seller_id:', reviewBasic.product_id);
        throw new Error('Product has no associated seller');
      }

      if (productData.seller_id !== sellerId) {
        console.error('Seller authorization failed:', {
          productSellerId: productData.seller_id,
          requestingSellerId: sellerId,
          reviewId,
          productId: reviewBasic.product_id
        });
        throw new Error('Unauthorized');
      }

      const { data, error } = await supabase
        .from('reviews')
        .update({
          seller_reply: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
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
        .single();

      if (error) {
        console.error('Error deleting seller reply:', error);
        throw new Error('Failed to delete reply');
      }

      return mapReviewRowToFeedItem(data);
    } catch (error) {
      console.error('Error in deleteSellerReply:', error);
      throw error;
    }
  }
}

export const reviewService = new ReviewService();
