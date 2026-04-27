# Email Confirmation Setup Guide

**Last Updated:** April 2026

---

## Current Status
✅ **Confirmation email template created**: `supabase/email-templates/confirm-signup.html`

The template follows the same design pattern as the password reset email and includes:
- Professional BazaarX branding
- Clear call-to-action button
- Fallback link for email clients that don't support button styling
- Explanation of why email verification is important
- 24-hour expiration notice

---

## How It Works (Canonical Flow)

All signup flows — buyer and seller — share the **same two-phase pattern**:

### Phase 1: Collect Data, Trigger Verification
1. User fills in their details (email, password, role-specific fields).
2. The client calls `authService.signUp(email, password, metadata)` to create the `auth.users` entry and trigger the Supabase verification email.
3. All collected form data is **persisted to `authStore.pendingSignupData`** so it survives the deep-link redirect.
4. The user is routed to `EmailVerificationScreen`, which polls for verification status.

### Phase 2: Post-Verification Finalization
1. Once the user clicks the link in their email, their `auth.users` record is verified by Supabase.
2. `EmailVerificationScreen` detects the change and routes to the appropriate finalizer based on `signupData.user_type`:
   - **`buyer`** → navigates directly to `MainTabs` (Home).
   - **`seller`** → navigates to `SellerFinalizeScreen`.
3. The finalizer screen completes the **database insertions** (profiles, sellers, seller_business_profiles) now that an authenticated session is available.
4. `pendingSignupData` is **cleared from the store** after successful finalization.

---

## Seller-Specific: Two-Step Signup + Deferred Verification

The seller signup (`app/seller/signup.tsx`) uses a **2-step form** before invoking verification:

- **Step 1 (Account):** Email, Password, Confirm Password, Terms Agreement.
- **Step 2 (Store Details):** Store Name, Phone Number, Store Address, Store Description.

After step 2, the user submits. The flow then:
1. Checks if the email already exists via `authService.getEmailRoleStatus(email)`.
   - **Existing buyer account:** Resends the verification link and routes to `EmailVerificationScreen`.
   - **Already verified:** Routes directly to `SellerFinalizeScreen`.
   - **New user:** Calls `authService.signUp()` and routes to `EmailVerificationScreen`.
2. All store details (storeName, storeAddress, storeDescription, phone) are saved in `authStore.pendingSignupData` before navigating away.

### Post-Verification: `SellerFinalizeScreen` (`app/seller/finalize.tsx`)

This screen runs automatically after email verification is confirmed. It:
1. Reads `pendingSignupData` from `authStore`.
2. Ensures a valid session (performs silent login if deep-linking failed and credentials are available).
3. Performs database writes in sequence:
   - Updates `profiles` table with `first_name` and `phone`.
   - Calls `authService.addUserRole(userId, 'seller')`.
   - Upserts into `sellers` table (`store_name`, `store_description`, `approval_status: 'pending'`).
   - Upserts into `seller_business_profiles` table (`address_line_1`).
4. Updates `sellerStore` and `authStore` to activate the seller role.
5. Clears `pendingSignupData` and navigates to `SellerStack`.

---

## Supabase Configuration

### Step 1: Go to Supabase Dashboard
1. Navigate to https://supabase.com/dashboard/project/ijdpbfrcvdflzwytxncj
2. Go to **Authentication → Providers**
3. Locate **Email** provider

### Step 2: Configure Email Settings
1. Under "Email" provider, find **Confirm signup**
2. **Enable** the "Confirm signup" toggle
3. This makes email verification mandatory before users can access their accounts

### Step 3: SMTP Configuration (Resend)
The project uses Resend as the SMTP provider. For emails to work in non-sandbox mode:
- A **production domain** must be verified on the Resend dashboard.
- The `Sender email address` in Supabase Auth settings must use that domain (e.g., `noreply@yourdomain.com`).
- Using `onboarding@resend.dev` is only for **sandbox/testing**; real delivery requires a verified domain.

> **Note for team:** Raise the domain provisioning requirement with the supervisor, as they control the Resend account.

### Step 4: Redirect URL Configuration
The email confirmation link redirects back into the app (mobile) or site (web). Ensure the following are added to **Authentication → URL Configuration → Allowed Redirect URLs**:
- Mobile (native deep link): `bazaarx://auth/callback`
- Mobile (Expo Go dev): `exp://192.168.x.x:8081/--/auth/callback`
- Web (production): `https://yourdomain.com/auth/callback`
- Web (local dev): `http://localhost:5173/auth/callback`

---

## Template Variables Available
- `{{ .ConfirmationURL }}` - The verification link
- `{{ .Email }}` - The user's email address
- `{{ .Data }}` - Custom data fields from signup

---

## Testing the Confirmation Flow

1. Sign up with a test email via the seller or buyer signup form.
2. Check the email inbox for the confirmation email.
3. Click the link to activate the account.
4. **For buyers:** Should be redirected directly to `MainTabs` (Home).
5. **For sellers:** Should be redirected to `SellerFinalizeScreen`, which sets up the store database records, then lands in the Seller Dashboard.

---

## Disable Email Confirmation (If Needed for Development)
- Go to **Authentication → Providers → Email**
- Toggle off "Confirm signup"
- Users can immediately use accounts after signup

---

## Web Parity Requirements

The web version must implement the **same two-phase pattern** to be 1:1 with mobile:

1. **Phase 1 (Form → Trigger Verification):**
   - Collect all required fields upfront (no step for email verification in the middle of the form).
   - Call Supabase `auth.signUp()` with user metadata.
   - Persist the pending form data to a state store (e.g., Zustand, context, or sessionStorage).
   - Route user to a "Check your email" screen.

2. **Phase 2 (Post-Verification Finalizer):**
   - On the callback URL (after the user clicks the email link), detect the verified session.
   - Check the `user_type` from the URL hash/session metadata.
   - For sellers: run the same DB insertions (`profiles`, `sellers`, `seller_business_profiles`).
   - For buyers: route directly to home.
   - Clear any pending data from the store.

This ensures both platforms share the same data model, timing of DB writes, and role assignment logic.
