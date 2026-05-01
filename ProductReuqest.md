# AI Implementation Prompt: EPIC 7 - Product Request System

## Context & Overview
You are an expert full-stack developer AI. Your task is to implement **EPIC 7: Product Request System** for the BazaarX platform. This system allows Buyers to request new products, pledge/stake BazCoins to show demand, and tracks the lifecycle of these requests as Admins review them, Suppliers offer sourcing quotes, and the system converts successful requests into verified marketplace listings.

Please read through the architecture requirements, data models, and module specifications below. Implement the system sequentially, ensuring all Acceptance Criteria (AC) are met.

---

## 1. Implicit Data Models Needed
Based on the user stories, ensure the following core entities are implemented in the database:
*   **`ProductRequest`**: `id`, `buyer_id`, `title`, `summary`, `category`, `status` (New, Under Review, Already Available, Approved for Sourcing, Rejected, On Hold, Converted to Listing), `sourcing_stage` (Quoting, Sampling, Negotiating, Ready for Verification), `demand_count`, `staked_bazcoins`, `linked_product_id`, `rejection_hold_reason`.
*   **`RequestAttachment`**: `id`, `request_id`, `file_url`, `file_type`, `is_supplier_link` (boolean, admin-only visibility).
*   **`RequestSupport`**: `id`, `request_id`, `user_id`, `type` (Upvote, Pledge, Stake), `bazcoin_amount`.
*   **`SupplierOffer`**: `id`, `request_id`, `supplier_id`, `price`, `moq`, `lead_time`, `terms`, `quality_notes`.
*   **`RequestAuditLog`**: `id`, `request_id`, `admin_id`, `action` (Approve, Reject, Merge, Hold, Resolve), `timestamp`, `details`.
*   **`TrustArtifact`**: `id`, `product_id`, `type` (Report, Test Video, True-Spec Label), `grade` (Grade A, B, C).

---

## 2. Modules & User Stories for Implementation

### Module 1: Buyer Request Creation & Management
**Objective:** Allow buyers to create, edit, submit, and track their own requests.

*   **BX-07-001 (Attachments)**: Buyer can attach reference links, photos, or sample descriptions. System accepts supported formats, rejects invalid ones, and displays them in request details.
*   **BX-07-002 (Draft & Edit)**: Buyer can review/edit request details and attachments before final submission. Prevent submission if data is missing/invalid.
*   **BX-07-003 (Submission Confirmation)**: Show confirmation upon successful save. Associate with the correct Buyer account.
*   **BX-07-004 (Status Tracking)**: Buyer can view current system status (under review, sourcing, etc.) for their own requests.
*   **BX-07-010 (Account Association)**: Requests are permanently linked to the creator. Ownership is protected.
*   **BX-07-014 (Timeline/Progress Tracker)**: Display a visual timeline of stages (submission -> review -> sourcing -> verification -> listing).
*   **BX-07-015 (Consolidated View)**: Buyer dashboard showing all submitted and supported requests.
*   **BX-07-019 (Outcome Transparency)**: Show the reason for final statuses (closed, rejected, held, already available) on the buyer's request details view.

### Module 2: Demand Aggregation, Browsing & Staking
**Objective:** Allow users to browse, search, and support requests to build demand signals.

*   **BX-07-005 (Browsing)**: Buyers can browse existing valid/visible requests showing name, summary, and demand indicators.
*   **BX-07-006 (Upvote/Pledge)**: Buyers can upvote/pledge once per request. Update demand count accurately.
*   **BX-07-007 (Stake BazCoins)**: Users can stake BazCoins to show intent. Deduct from balance, update request total, show confirmation.
*   **BX-07-008 (Demand Visibility)**: Show total supporters count accurately on list and detail views.
*   **BX-07-013 (Search & Filter)**: Keyword search, and filters for category, demand level, or status with pagination.
*   **BX-07-020 (Deduplication - Platform)**: Detect similar requests, consolidate them (preserving all demand/stakes), and link users to the main record.
*   **BX-07-021 (Ranking - Platform)**: Prioritize requests in views based on votes, pledges, staked BazCoins, and quality.
*   **BX-07-027 (Demand Transfer - Platform)**: If a request is linked to an existing product, transfer and aggregate its demand signals to that product.

### Module 3: Notifications, Rewards & Linking
**Objective:** Inform users of progress and reward successful sourcing.

*   **BX-07-009 (Milestone Notifications)**: Notify supporters/creators when thresholds are met, approved, or moved to verification.
*   **BX-07-011 (BazCoin Rewards)**: Award BazCoins to original requesters when a request becomes a verified listing. Log the transaction.
*   **BX-07-012 (Participation Status)**: Show users if they submitted, supported, or were rewarded on a request.
*   **BX-07-016 (Listing Notifications)**: Notify all supporters/stakers when a requested product becomes a verified listing.
*   **BX-07-017 (Already Available Notifications)**: Notify creator/supporters when a request is matched to an existing product.
*   **BX-07-018 (Direct Access)**: Allow buyers to click from their resolved request directly to the existing matched product listing page.
*   **BX-07-022 (Incentive Validation)**: Platform strict validation to award incentives *only* if success conditions are met.

### Module 4: Admin Review & Moderation
**Objective:** Tools for admins to review, deduplicate, and moderate requests.

*   **BX-07-023 (Audit Logging)**: Log all admin review actions (approve, reject, merge, hold, resolve) with Admin ID, timestamp, and action type.
*   **BX-07-024 (Supplier Link Privacy)**: User-contributed supplier links are strictly private and visible ONLY to Admins.
*   **BX-07-025 (Existing Product Suggestions)**: System auto-suggests existing marketplace products to Admins based on request keywords/category.
*   **BX-07-026 (Auto-Close Matches)**: "Already Available" requests are auto-closed/converted and skip the sourcing workflow.
*   **BX-07-028 (Pending Review Queue)**: Admin view of incoming requests, showing full details, demand, and requesters.
*   **BX-07-029 (Admin Actions)**: Execute approve, reject, merge, hold, or link actions with validation.
*   **BX-07-030 (Comprehensive Detail View)**: Admin detail view including references, total stakes, and requester history.
*   **BX-07-031 (Internal Statuses)**: Update statuses explicitly (New, Under Review, Already Available, Approved for Sourcing, Rejected, On Hold, Converted to Listing).
*   **BX-07-032 (Action Reasons)**: Mandate inputting a reason when Rejecting or Holding a request.
*   **BX-07-033 & 034 (Mark Already Available)**: Admin checks for existing products and links the marketplace product ID to the request, updating status.
*   **BX-07-035 (Resolution View)**: Admin list view specifically for requests marked as "Already Available" and their linked products.
*   **BX-07-036 (Review History)**: Admin view to trace prior decisions, merges, holds, and resolutions for any request.
*   **BX-07-037 (Admin Dashboards)**: Analytics for request volume, top-demand items, conversion rates, and outcomes.

### Module 5: Sourcing, Suppliers, and Verification
**Objective:** Connecting approved requests to suppliers and converting them into verified listings.

*   **BX-07-038 (Supplier Demand View)**: Sellers/Suppliers can see total interested users and staked BazCoins for eligible requests to formulate quotes.
*   **BX-07-039 (Supplier Quotes)**: Authorized suppliers submit bulk quotes (price, MOQ, lead time, terms) on high-demand requests.
*   **BX-07-040 (Sourcing Workflow Entry)**: Approved requests move to the supplier sourcing workflow.
*   **BX-07-041 (Admin Sourcing Records)**: Admins log multiple supplier candidates, quotes, MOQs, and quality notes for comparison.
*   **BX-07-042 (Sourcing Stage Tracking)**: Track sub-stages: quoting, sampling, negotiating, ready for verification.
*   **BX-07-043 (Forward to Verification)**: Admins transition ready products into the BazaarX verification workflow.
*   **BX-07-044 (Trust Artifacts)**: Converted product listings display reports, test videos, and true-spec labels.
*   **BX-07-045 (Trust Grades)**: Platform assigns and displays Grade A, B, or C to verified sourced products.

---

## AI Implementation Instructions

1.  **Database & Schema**: Begin by writing the schema migrations and defining ORM models for `ProductRequest`, `RequestSupport`, `SupplierOffer`, etc. Ensure foreign keys and constraints match the rules (e.g., uniqueness on user upvotes per request).
2.  **API & Business Logic**: Implement the backend controllers and services. Pay special attention to:
    *   BazCoin deduction and reward transaction logic (Must be ACID compliant).
    *   State machine logic for Request Status transitions (e.g., A request cannot go from "New" directly to "Converted to Listing").
    *   Role-based access control (RBAC): Ensure Buyers only edit their own drafts; Suppliers only see eligible requests; Admins see private supplier links.
3.  **Frontend Components**: 
    *   Create the Buyer forms (with file upload validation).
    *   Build the Request List and Detail views (including the visual timeline progress tracker).
    *   Construct the Admin Dashboard and review panels.
4.  **Testing**: Generate unit and integration tests specifically testing the Acceptance Criteria (e.g., "Verify user cannot pledge twice", "Verify admin action is written to Audit Log").