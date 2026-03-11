# Seller QA & Logistics Flow Update

This document summarizes the recent updates made to the **Seller QA** section (`SellerProductStatus.tsx`) and the overall flow for product quality assurance.

## Core Changes & Enhancements

### 1. Unified Logistics Display
- Created a robust parser (`formatLogisticsInfo`) to process both robust JSON tracking data (e.g., `{"METHOD": "ONSITE VISIT", "TRACKINGNUMBER": "Scheduled for..."}`) and legacy simple string formats (e.g., `"Courier"`).
- Applied consistent formatting:
  - **Courier**: Displays "Courier • Tracking Number".
  - **Onsite Visit**: Displays "Onsite Drop-off • Scheduled Date".
- Cleaned up redundant displays by completely hiding the logistics label on individual products that are already inside a bulk/batch folder.

### 2. Bulk/Batch Submissions & Actions
- Submissions in bulk now automatically group the items into a "Bulk Shipment Folder" under the QA interface.
- Removed individual action buttons (like "Submit for QA" or "Confirm Shipment") from products *inside* a bulk folder, centralizing those controls strictly on the **Folder Header**.
- The main Select All submittable checkbox was restricted exclusively to items in the **Digital Review** status (hiding it from the immediate 'Pending' tab). 
- The "All Products" tab has been repositioned as the very last tab for better organizational flow.

### 3. Smart Scheduling & Drop-offs
- The automated flow opening the calendar modal after selecting "Physical Sample" was reverted for bulk functionality to prevent UI clipping and conflicts.
- **Calendar Enhancements**: The "Schedule Drop-off" calendar now physically disables all past dates, preventing sellers from mistakenly scheduling a drop-off backward in time.
- **Scheduled Display for Reviewers**: 
  - Added a highly visible, prominent blue badge showing the exact scheduled drop-off date prominently on the right-hand side of individual item rows and Bulk Folder headers when they reach the `QA Queue` (In Quality Review status).
  - Displays "Pending" safely as a fallback for older development-stage products that were submitted before the JSON date format tracking existed.

### 4. Rescheduling Missed Drop-offs
- Implemented logic scanning products currently sitting in the QA Queue that chose "Onsite Visit".
- If the current local date is past the product's scheduled drop-off date, the standard scheduled badge visually switches to a red **"Missed Drop-off"** badge.
- A **"Reschedule"** button automatically appears for both individual items and the Bulk Folder header. 
- Updated backend (`productQAStore.ts`) to safely permit the `submitSample` function to process tracking date modifications even when the item is already in `IN_QUALITY_REVIEW` (previously only accepted `WAITING_FOR_SAMPLE`).

---

## The Current QA & Logistics Flow

### Phase 1: Digital Review
1. A seller creates a product. 
2. It lands in **Pending** (Admin Review). Once accepted, it moves to **In Digital Review** (`PENDING_DIGITAL_REVIEW`).
3. The seller can optionally select multiple products here and click **Submit Batch for QA**.
4. A modal appears requiring them to choose:
   - **Digital Photos Only**
   - **Send Physical Sample**

### Phase 2: Physical Sample Submission
1. If the physical sample path is chosen, the items transition to **Awaiting Sample** (`WAITING_FOR_SAMPLE`). 
2. The seller needs to officially hand over the product in person or via shipping. They have two main action buttons:
   - **Confirm Shipment** (If using Courier): Inputs courier name and tracking code.
   - **Schedule Drop-off** (If using Onsite Visit): Opens the unified calendar (past dates disabled) to book an appointment.
3. Once tracking info or a date is confirmed, the system saves the method as a formatted JSON document into the product's `logistics` property.

### Phase 3: QA Queue & Rescheduling
1. The submitted products transition straight into the **QA Queue** (`IN_QUALITY_REVIEW`).
2. The UI cleanly extracts and displays the tracking code or scheduled date via a sleek badge. 
3. **Rescheduling Flow**:
   - The system checks the booked date at midnight daily.
   - If the seller never showed up and the booked date is in the past:
     - The item transforms to say **"Missed Drop-off"**.
     - Provides a **Reschedule** button taking them back to Phase 2's calendar modal seamlessly updating the backend entry.

### Phase 4: Final Verdict
1. QA physically inspects the item from dropoff/mail.
2. The item is passed (**Verified**) or bounced back (**For Revision** / **Rejected**) with clear alerts pinned to the item showing the exact rejection reason.
