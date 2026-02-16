# Future Features: Real-Time Review Voting

This document outlines the implementation plan for adding real-time updates to the review voting system.

## Current Implementation

The review voting system currently uses a request-response model:
- Users toggle their vote via API calls
- Vote counts are updated after page refresh or manual refetch
- No live synchronization between multiple users viewing the same review

## Proposed Enhancement: Real-Time Vote Updates

### Overview
Implement Supabase Realtime subscriptions to push vote count updates to all connected clients viewing a product's reviews. This will create a more engaging and dynamic user experience.

### Technical Implementation

#### 1. Enable Realtime on review_votes Table

```sql
-- Enable realtime for review_votes table
ALTER PUBLICATION supabase_realtime ADD TABLE review_votes;
```

#### 2. Subscribe to Vote Changes

In `ProductReviews.tsx`, add a realtime subscription:

```typescript
useEffect(() => {
  // ... existing fetch logic ...
  
  // Subscribe to real-time vote updates
  const subscription = supabase
    .channel(`review_votes:product:${productId}`)
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'review_votes',
        filter: `review_id=in.(SELECT id FROM reviews WHERE product_id='${productId}')`
      },
      (payload) => {
        // Handle vote change
        handleRealtimeVoteChange(payload);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [productId]);

const handleRealtimeVoteChange = (payload: any) => {
  const { eventType, new: newRecord, old: oldRecord } = payload;
  
  if (eventType === 'INSERT') {
    // Increment count for the review
    updateReviewVoteCount(newRecord.review_id, 1);
  } else if (eventType === 'DELETE') {
    // Decrement count for the review
    updateReviewVoteCount(oldRecord.review_id, -1);
  }
};

const updateReviewVoteCount = (reviewId: string, delta: number) => {
  setReviews((prev) =>
    prev.map((review) =>
      review.id === reviewId
        ? { ...review, helpfulCount: Math.max(review.helpfulCount + delta, 0) }
        : review
    )
  );
};
```

#### 3. Optimistic UI Updates

Enhance the current toggle function with optimistic updates:

```typescript
const toggleReviewVote = async (reviewId: string) => {
  // Optimistically update UI
  const currentReview = reviews.find(r => r.id === reviewId);
  const isCurrentlyVoted = await reviewService.hasUserVoted(reviewId, userId);
  
  // Update local state immediately
  const delta = isCurrentlyVoted ? -1 : 1;
  updateReviewVoteCount(reviewId, delta);
  
  try {
    // Make API call
    await reviewService.toggleReviewVote(reviewId, userId);
  } catch (error) {
    // Revert on error
    updateReviewVoteCount(reviewId, -delta);
    showErrorToast('Failed to update vote');
  }
};
```

#### 4. Debounce Rapid Updates

To prevent UI flickering from multiple rapid votes:

```typescript
import { debounce } from 'lodash';

const debouncedUpdateVoteCount = debounce(
  (reviewId: string, newCount: number) => {
    setReviews((prev) =>
      prev.map((review) =>
        review.id === reviewId
          ? { ...review, helpfulCount: newCount }
          : review
      )
    );
  },
  300 // 300ms debounce
);
```

### Benefits

1. **Immediate Feedback**: Users see vote counts update instantly across all sessions
2. **Social Proof**: Dynamic counts create a sense of active community engagement
3. **Reduced API Calls**: Less need for manual refresh to see current vote counts
4. **Better UX**: Feels more responsive and modern

### Considerations

1. **Performance**: Monitor subscription overhead with high-traffic products
2. **Bandwidth**: Consider batching updates for products with many concurrent viewers
3. **Privacy**: Ensure no sensitive user data is exposed through realtime channels
4. **Error Handling**: Implement reconnection logic for dropped connections

### Implementation Priority

**Phase 1 (Current)**: ✅ Basic voting with manual refresh  
**Phase 2 (Future)**: Real-time vote count updates  
**Phase 3 (Future)**: Real-time new review notifications  

### Browser Support

Supabase Realtime uses WebSockets, supported in:
- All modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari 13+, Chrome Android)
- Graceful fallback to polling for older browsers

### Security

RLS policies on `review_votes` table already prevent unauthorized access. Realtime subscriptions respect these policies, so only permitted data changes are broadcast.

---

*Document created: 2026-02-16*  
*Author: Development Team*  
*Status: Planned Feature*
