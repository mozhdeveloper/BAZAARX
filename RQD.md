# Comments & Contributor System
## Implementation Plan

> **Feature**: Crowdsourced Product Intelligence via a tiered comment/contribution system
> **Scope**: Web + Mobile (Buyer, Seller, Admin)
> **Status**: In Planning — Ready for Phase 1
> **Last Updated**: March 10, 2026
> **Owner**: BazaarX Engineering

---

## Table of Contents

1. [Overview](#1-overview)
2. [Comment Types](#2-comment-types)
3. [Gamification: Contributor Tiers](#3-gamification-contributor-tiers)
4. [Database Schema](#4-database-schema)
5. [Backend & Edge Functions](#5-backend--edge-functions)
6. [Web Implementation](#6-web-implementation)
7. [Mobile Implementation](#7-mobile-implementation)
8. [UI/UX Specification](#8-uiux-specification)
9. [Business Logic Rules](#9-business-logic-rules)
10. [Implementation Phases](#10-implementation-phases)
11. [Success Metrics](#11-success-metrics)

---

## 1. Overview

The comment system transforms passive shoppers into **active contributors** who help BazaarX source, validate, and quality-check products. Users earn BazCoins for contributing intelligence, and the platform crowdsources what would otherwise be expensive sourcing research.

**Core tagline**: *"You're not just buying — you're building the marketplace together."*

### Key Goals
- Lower product sourcing cost via crowdsourced supplier intelligence
- Improve QA quality through collective product expertise
- Drive repeat engagement via gamified contribution rewards
- Build a trusted knowledge base around every product request

---

## 2. Comment Types

| Type | Icon | Visibility | BazCoin Reward | Purpose |
|------|------|-----------|---------------|---------|
| **Sourcing** | 🔗 | Admin-only | +150 BC | Supplier links, manufacturer contacts, MOQ/pricing intel |
| **Quality Control (QC)** | 🛡️ | Public | +50 BC | Product expertise, warnings, test requirements |
| **General** | 💬 | Public | +25 BC | Discussion, questions, feature requests |

### 2.1 Sourcing Comments — Admin-Only
- Users submit supplier contacts, Alibaba/factory links, pricing, MOQ
- **Hidden from public** to prevent disintermediation (bypassing BazaarX to buy direct)
- Public view shows: contributor name, tier badge, BC earned, Lab upvote count — **no content**
- Admin/Lab view shows: full content including links, contacts, pricing
- Additional bonus BC awarded if Lab team marks the tip as Verified

### 2.2 Quality Control Comments — Public
- Product expertise, known defects, testing checklists, spec warnings
- Visible to all users to build trust and collective knowledge
- Lab team uses these to define physical QA inspection criteria

### 2.3 General Comments — Public
- Community discussion, enthusiasm, color/size/variant preferences
- Drives engagement and surfaces demand signals for the product team

---

## 3. Gamification: Contributor Tiers

Tiers are unlocked based on the **highest upvote count on a single comment** (not cumulative across all comments).

| Tier | Upvotes Required | BC Multiplier | Perks |
|------|-----------------|--------------|-------|
| _(None)_ | 0–9 | 1.00× | — |
| 🥉 **Bronze** | 10–49 | 1.25× (+25%) | Bronze badge displayed platform-wide |
| 🥈 **Silver** | 50–99 | 1.50× (+50%) | Silver badge, early product access |
| 🥇 **Gold** | 100+ | 2.00× (+100%) | Gold badge, founder perks, platform recognition |

### Tier Rules
- Tier is recalculated after **every upvote** on any of the user's comments
- BC multiplier applies **at award time** (prospective only, not retroactive)
- Tier badge shown next to username across all platform surfaces
- Lab upvotes are tracked separately and shown only on sourcing comments

---

## 4. Database Schema

### 4.1 New Tables

```sql
-- Product request comments (references existing product_requests table)
CREATE TABLE public.product_request_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID NOT NULL REFERENCES public.product_requests(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id),
  type          TEXT NOT NULL CHECK (type IN ('sourcing', 'qc', 'general')),
  content       TEXT NOT NULL,
  is_admin_only BOOLEAN NOT NULL DEFAULT false, -- always true for sourcing type
  bc_awarded    INTEGER NOT NULL DEFAULT 0,
  upvotes       INTEGER NOT NULL DEFAULT 0,
  admin_upvotes INTEGER NOT NULL DEFAULT 0,     -- Lab team upvotes (separate counter)
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- One upvote per user per comment (enforced by unique constraint)
CREATE TABLE public.comment_upvotes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.product_request_comments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

-- Contributor tier per user (upserted on every upvote)
CREATE TABLE public.contributor_tiers (
  user_id       UUID PRIMARY KEY REFERENCES public.profiles(id),
  tier          TEXT NOT NULL DEFAULT 'none' CHECK (tier IN ('none', 'bronze', 'silver', 'gold')),
  max_upvotes   INTEGER NOT NULL DEFAULT 0,
  bc_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 Indexes

```sql
CREATE INDEX idx_prc_request_id ON public.product_request_comments(request_id);
CREATE INDEX idx_prc_user_id    ON public.product_request_comments(user_id);
CREATE INDEX idx_prc_type       ON public.product_request_comments(type);
CREATE INDEX idx_cu_comment_id  ON public.comment_upvotes(comment_id);
```

### 4.3 RLS Policies

```sql
-- Sourcing comments visible only to admin/lab; all others visible to everyone
CREATE POLICY "prc_select" ON public.product_request_comments
  FOR SELECT USING (
    is_admin_only = false
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'lab')
    )
  );

-- Authenticated users can post comments
CREATE POLICY "prc_insert" ON public.product_request_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users cannot edit or delete their own comments
-- (Only admins can delete via admin panel — no public DELETE policy)

-- Users can upvote (unique constraint prevents duplicates at DB level)
CREATE POLICY "cu_insert" ON public.comment_upvotes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users cannot upvote their own comments (enforced in edge function)
```

### 4.4 Migration File
**Path**: `supabase-migrations/015_comments_contributor_system.sql`

---

## 5. Backend & Edge Functions

### 5.1 `post-comment`
**Path**: `supabase/functions/post-comment/index.ts`

- Validate `type` ∈ `['sourcing', 'qc', 'general']` and `request_id` exists
- Set `is_admin_only = true` if `type === 'sourcing'`
- Fetch user's current `contributor_tiers.bc_multiplier` (default 1.00)
- Calculate final BC: `base × multiplier`
- Insert into `product_request_comments`
- Call `award-bc` utility with final amount
- Return created comment — **content redacted** for non-admin callers on sourcing type

### 5.2 `upvote-comment`
**Path**: `supabase/functions/upvote-comment/index.ts`

- Reject if `auth.uid() === comment.user_id` (no self-upvotes)
- Insert into `comment_upvotes` (unique constraint handles dedup at DB level)
- Increment `product_request_comments.upvotes` (or `admin_upvotes` if caller is Lab/Admin)
- Trigger `recalculate-tier` for comment's author

### 5.3 `recalculate-tier`
**Path**: `supabase/functions/recalculate-tier/index.ts`

- Query `MAX(upvotes)` across all comments by `user_id`
- Map to tier: `< 10 → none`, `10-49 → bronze`, `50-99 → silver`, `≥ 100 → gold`
- Map to multiplier: `1.00 / 1.25 / 1.50 / 2.00`
- Upsert `contributor_tiers` row for user

### 5.4 `award-bc` (Reusable Utility)
**Path**: `supabase/functions/award-bc/index.ts`

- Inputs: `user_id`, `amount`, `reason`, `multiplier?`
- Insert into `bazcoin_transactions`
- Increment `buyers.bazcoins` balance

---

## 6. Web Implementation

### 6.1 New Components

| Component | Path | Description |
|-----------|------|-------------|
| `CommentSection` | `src/components/requests/CommentSection.tsx` | Container — fetches and renders all comment types for a request |
| `CommentCard` | `src/components/requests/CommentCard.tsx` | Single comment; handles admin-only masking for sourcing type |
| `CommentForm` | `src/components/requests/CommentForm.tsx` | Post new comment with type selector (Sourcing / QC / General) |
| `ContributorBadge` | `src/components/ui/ContributorBadge.tsx` | Reusable tier badge (Bronze/Silver/Gold) shown next to usernames |
| `SourcingAdminView` | `src/components/admin/SourcingAdminView.tsx` | Full sourcing comment detail + Verify/Bonus BC actions for Lab team |

### 6.2 State Management

**New store**: `src/stores/commentStore.ts`

```typescript
// Types
type CommentType = 'sourcing' | 'qc' | 'general';
type ContributorTier = 'none' | 'bronze' | 'silver' | 'gold';

interface Comment {
  id: string;
  requestId: string;
  userId: string;
  userName: string;
  userTier: ContributorTier;
  type: CommentType;
  content: string | null;   // null if sourcing + viewer is not admin/lab
  isAdminOnly: boolean;
  bcAwarded: number;
  upvotes: number;
  adminUpvotes: number;
  hasUpvoted: boolean;
  createdAt: string;
}

interface CommentStore {
  comments: Comment[];
  isLoading: boolean;
  fetchComments: (requestId: string) => Promise<void>;
  postComment: (requestId: string, type: CommentType, content: string) => Promise<void>;
  upvoteComment: (commentId: string) => Promise<void>;   // optimistic update
}
```

### 6.3 Pages to Modify

| Page | Change |
|------|--------|
| `AdminProductRequests.tsx` | Add `CommentSection` + `SourcingAdminView` to request detail side panel |
| `AdminProductRequests.tsx` | New "Contributions" tab inside request detail |
| `AdminProductRequests.tsx` | Lab upvote button on sourcing comments + "Mark Verified" + "Award Bonus BC" actions |

### 6.4 New Pages

| Page | Path | Description |
|------|------|-------------|
| Product Request Detail | `src/pages/ProductRequestDetailPage.tsx` | Buyer-facing request detail with public `CommentSection` |

---

## 7. Mobile Implementation

### 7.1 New Components

| Component | Path | Description |
|-----------|------|-------------|
| `CommentSection` | `src/components/requests/CommentSection.tsx` | React Native port — same logic as web |
| `CommentCard` | `src/components/requests/CommentCard.tsx` | With masked sourcing view for non-admin buyers |
| `CommentForm` | `src/components/requests/CommentForm.tsx` | Bottom sheet input with type picker |
| `ContributorBadge` | `src/components/ui/ContributorBadge.tsx` | RN tier badge component |

### 7.2 Screens to Modify

| Screen | Change |
|--------|--------|
| Product request detail screen | Add comment thread below request info |
| `ProfileScreen.tsx` | Show contributor tier badge + total BC earned from contributions |

---

## 8. UI/UX Specification

### 8.1 Comment Card — Public (QC / General)

```
┌──────────────────────────────────────────┐
│ 🛡️ QC Comment                            │
│ HeadphoneGeek 🥈  •  2 hours ago         │
│                                          │
│ "Make sure these have the updated hinge  │
│  design. Earlier batches cracked after   │
│  6 months..."                            │
│                                          │
│ 👍 34 upvotes   [Upvote]   +50 BC earned │
└──────────────────────────────────────────┘
```

### 8.2 Sourcing Comment — Public Masked View

```
┌──────────────────────────────────────────┐
│ 🔒 Sourcing Tip Submitted                │
│ AudioPro 🥇  •  3 hours ago             │
│                                          │
│ Sourcing intelligence submitted to the   │
│ Lab team (details visible to team only)  │
│                                          │
│ 👍 67 Lab upvotes   +150 BC earned       │
└──────────────────────────────────────────┘
```

### 8.3 Sourcing Comment — Admin Full View

```
┌──────────────────────────────────────────┐
│ 🔒 ADMIN-ONLY  •  🔗 Sourcing            │
│ AudioPro 🥇  •  3 hours ago             │
│                                          │
│ "Found this manufacturer on Alibaba..."  │
│ 🔗 https://alibaba.com/supplier/xyz      │
│ Contact: james@techcore.com              │
│ WhatsApp: +86 138 xxxx xxxx             │
│ MOQ: 500 units  •  Lead time: 30 days   │
│                                          │
│ [✅ Mark Verified]  [💰 Award Bonus BC]  │
│ 👍 67 Lab upvotes                        │
└──────────────────────────────────────────┘
```

### 8.4 Comment Type Selector (Post Form)

```
Select contribution type:
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ 🔗 Sourcing │  │ 🛡️ QC Tip  │  │ 💬 General  │
│  +150 BC   │  │   +50 BC   │  │   +25 BC   │
└─────────────┘  └─────────────┘  └─────────────┘
```

### 8.5 Branding Notes
- Primary color: `#D97706` (amber) for BC rewards and active states
- Badge colors: Bronze `#CD7F32`, Silver `#C0C0C0`, Gold `#FFD700`
- Sourcing masked card: amber left border + lock icon
- Admin-only content: red `[ADMIN ONLY]` pill on card header

---

## 9. Business Logic Rules

| Rule | Details |
|------|---------|
| Sourcing BC award | Immediate on submit; bonus BC if Lab marks Verified |
| Self-upvote | Not allowed — enforced in `upvote-comment` edge function |
| Tier recalculation | Triggered on every upvote; uses **max single-comment upvotes** (not cumulative) |
| BC multiplier | Applied at award time only — not retroactive to previous contributions |
| Lab upvotes | Separate `admin_upvotes` counter; not mixed with public `upvotes` |
| Delete comment | Admin-only; BC is **not** reversed on deletion |
| Edit comment | Not allowed after posting — sourcing data must be immutable |
| Duplicate upvote | Blocked by `UNIQUE (comment_id, user_id)` at DB level |

---

## 10. Implementation Phases

### Phase 1 — Database & Backend _(Week 1)_

- [ ] Create migration `015_comments_contributor_system.sql`:
  - `product_request_comments` table
  - `comment_upvotes` table
  - `contributor_tiers` table
  - All indexes listed in §4.2
  - RLS policies from §4.3
- [ ] Edge function: `post-comment` with BC award logic
- [ ] Edge function: `upvote-comment` + self-upvote guard
- [ ] Edge function: `recalculate-tier`
- [ ] Edge function: `award-bc` utility (reusable across features)

### Phase 2 — Web Admin Panel _(Week 2)_

- [ ] `commentStore.ts` — Zustand store with Supabase integration
- [ ] `ContributorBadge.tsx` — Reusable tier badge component
- [ ] `SourcingAdminView.tsx` — Full sourcing detail for Lab team
- [ ] Update `AdminProductRequests.tsx`:
  - Add "Contributions" tab to request detail panel
  - Integrate `SourcingAdminView` for sourcing comments
  - Lab upvote button + "Mark Verified" + "Award Bonus BC" actions

### Phase 3 — Web Buyer-Facing _(Week 2–3)_

- [ ] `CommentForm.tsx` — Type picker (Sourcing / QC / General) with BC preview
- [ ] `CommentCard.tsx` — Masked sourcing view for buyers; full view for admins
- [ ] `CommentSection.tsx` — Container with fetch + real-time subscription
- [ ] Upvote interaction with optimistic UI update
- [ ] `ProductRequestDetailPage.tsx` — New buyer-facing request detail page
- [ ] Tier badge displayed on user avatars across product request surfaces

### Phase 4 — Mobile _(Week 3–4)_

- [ ] Port `CommentSection`, `CommentCard`, `CommentForm` to React Native
- [ ] Bottom sheet comment form with type picker (matches web logic)
- [ ] Update `ProfileScreen.tsx` — Show tier badge + contribution history
- [ ] Push notification on upvote milestones (tier unlock events)

### Phase 5 — Polish & Analytics _(Week 4)_

- [ ] Contributor leaderboard page (web + mobile)
- [ ] Success metrics dashboard (comments/request, sourcing count, return rate)
- [ ] Email notification on tier upgrade
- [ ] Admin report: sourcing comments utilized vs. ignored
- [ ] Realtime comment feed via Supabase Realtime subscriptions

---

## 11. Success Metrics

| Metric | Target — Good | Target — Excellent |
|--------|-------------|-------------------|
| Comments per product request | 5–10 | 20+ |
| Sourcing comments per request | 1–2 | 3–5 |
| QC comments per request | 3–5 | 10+ |
| Contributor return rate | 30% | 60%+ |
| Users reaching Bronze+ tier | 20% | 40%+ |
| Sourcing cost per product (BC) | < 500 BC (~₱5) | < 200 BC (~₱2) |

---

## 12. Dependencies & Assumptions

| Dependency | Status | Notes |
|------------|--------|-------|
| `product_requests` table | ✅ Exists | Migration references it |
| `profiles` table | ✅ Exists | User identity source |
| `buyers.bazcoins` balance field | ✅ Exists | Updated by `award-bc` |
| `bazcoin_transactions` table | ⚠️ Verify exists | Required by `award-bc` |
| Supabase Edge Functions runtime | ✅ Available | Deno-based, existing pattern in project |
| RLS enabled on new tables | 🔲 To-do | Part of Phase 1 migration |

---

*Generated from product planning session — March 10, 2026*
