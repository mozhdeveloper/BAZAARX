## Buyer Name Persistence During Role Switching — Implementation Plan (V1)

### 1. Goal and Problem Statement

- **Goal**: Ensure a buyer’s display name (first name + last name) is **stable and consistent** across:
  - Normal buyer login (email/password and future OAuth flows).
  - Buyer ↔ Seller role switching (including back-and-forth switches).
  - Session restore / page refresh.
- **Current bug**:
  - Initial buyer login shows a name (e.g. `buyer1`) derived from email or existing profile.
  - After switching **Buyer → Seller → Buyer** (without re-login), the buyer name becomes **blank**.
- **Root causes**:
  - `BuyerLoginPage` and `useBuyerStore.initializeBuyerProfile` use **different logic** to derive `firstName` / `lastName`.
  - For some test accounts, `profiles.first_name` / `last_name` are **empty**, so `initializeBuyerProfile` falls back to empty strings.
  - Role switching uses `initializeBuyerProfile` (no login step), so the fallback to `"User"` or email prefix is never applied.

### 2. Current Behavior (Quick Map)

- **Schema** (`profiles(detached).sql`):
  - `first_name text null`
  - `last_name text null`
  - No canonical `full_name` column (only used as legacy metadata in a few places).

- **Buyer login (email/password)** — `BuyerLoginPage.tsx`:
  - Fetches `profiles` row.
  - Previously: used `profileData.full_name || "User"` → produced `"User"` when full_name missing.
  - Now (after recent fix): derives:
    - `firstName` from `first_name` / legacy `full_name` / email prefix.
    - `lastName` from `last_name` / legacy `full_name`.
    - Uses a computed `displayFullName` for avatar fallback.
  - Sets `useBuyerStore` profile once, then navigates to `/shop`.

- **Session restore / role-switch hydration** — `buyerStore.ts`:
  - `initializeBuyerProfile(userId, profileData)`:
    - Joins `buyers` ↔ `profiles`.
    - Derives:
      - `firstName = profileInfo?.first_name || ''`
      - `lastName  = profileInfo?.last_name || ''`
    - No email / legacy fallback here yet.
  - Role switching and some routes call `initializeBuyerProfile` directly, bypassing `BuyerLoginPage`.

- **UI consumption**:
  - `Header.tsx`, `BuyerProfilePage.tsx`, and several components rely on `profile.firstName` / `profile.lastName`.
  - When both become empty, UI shows blank name or degraded fallbacks.

### 3. Design Principles for the Fix

- **Single source of truth** for buyer name derivation:
  - Encapsulate logic in one helper (inside `buyerStore` or a small `profileName` util).
  - Both `BuyerLoginPage` and `initializeBuyerProfile` use the same function.
- **Schema-respecting**:
  - Prefer `profiles.first_name` / `last_name`.
  - Gracefully fallback to:
    - Legacy `full_name` (if present).
    - Email prefix (before `@`).
    - Only then a generic `"User"` *as display only*, never as stored first_name.
- **Non-destructive**:
  - Never overwrite **non-empty** `first_name` / `last_name` in the database.
  - Only consider writing names when both are blank and we have a clear, better guess.
- **Role-switch friendly**:
  - Role switching should **not** silently wipe or downgrade names.
  - Buyer ↔ Seller upgrades should help populate missing profile names where we have reliable data (e.g. seller owner name).

### 4. Step-by-Step Implementation Plan

#### Step 1 — Introduce a shared name-derivation helper

- **Location options** (pick one):
  - `web/src/stores/buyerStore.ts` (as a local function near `initializeBuyerProfile`), or
  - `web/src/utils/profileName.ts` (if we foresee reuse elsewhere).
- **Function shape (conceptual)**:

  ```ts
  type RawProfileRow = {
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null; // legacy / optional
    email?: string | null;
  };

  function deriveBuyerName(profile: RawProfileRow | null | undefined): {
    firstName: string;
    lastName: string;
    displayFullName: string; // never empty; last resort "User"
  }
  ```

- **Logic**:
  - `firstName`:
    - `trim(first_name)` if set.
    - Else `full_name.split(" ")[0]` if `full_name` present.
    - Else email prefix (`email.split("@")[0]`).
    - Else empty string.
  - `lastName`:
    - `trim(last_name)` if set.
    - Else `full_name.split(" ").slice(1).join(" ")` if present.
    - Else empty string.
  - `displayFullName`:
    - If `firstName` || `lastName` non-empty: join and trim.
    - Else `"User"`.

#### Step 2 — Wire helper into `BuyerLoginPage`

- **File**: `web/src/pages/BuyerLoginPage.tsx`
- **Change**:
  - Replace the inline first/last name derivation with a call to `deriveBuyerName`.
  - Use `displayFullName` for avatar URL fallback.
- **Success criteria**:
  - Behavior stays the same as our current improved logic.
  - Code becomes thinner and easier to keep in sync with store logic.

#### Step 3 — Wire helper into `initializeBuyerProfile`

- **File**: `web/src/stores/buyerStore.ts`
- **Change** in `initializeBuyerProfile`:
  - Instead of:

    ```ts
    const firstName = profileInfo?.first_name || '';
    const lastName  = profileInfo?.last_name || '';
    ```

  - Use:

    ```ts
    const { firstName, lastName, displayFullName } = deriveBuyerName({
      first_name: profileInfo?.first_name,
      last_name: profileInfo?.last_name,
      full_name: (profileInfo as any)?.full_name,
      email: profileInfo?.email,
    });
    ```

  - Set `buyerInfo.firstName` / `buyerInfo.lastName` from this helper.
  - If `buyerData.avatar_url` is empty, use `displayFullName` for avatar fallback (consistent with login).

- **Result**:
  - When role switching calls `initializeBuyerProfile`, the buyer name is derived **identically** to a fresh login.
  - The “blank name after Buyer → Seller → Buyer” bug disappears, even if `profiles.first_name` / `last_name` are still not set.

#### Step 4 — (Optional but recommended) Backfill missing first/last names on profile

- **Goal**: If both `first_name` and `last_name` are empty but we can safely infer a name, **store** it to stabilize across all clients.

- **Strategy**:
  - Inside `initializeBuyerProfile`, after deriving names:

    ```ts
    const shouldBackfill =
      !profileInfo?.first_name &&
      !profileInfo?.last_name &&
      (firstName || lastName);
    ```

  - If `shouldBackfill`:
    - Run a **best-effort** update:

      ```ts
      await supabase
        .from('profiles')
        .update({
          first_name: profileInfo?.first_name || firstName || null,
          last_name: profileInfo?.last_name || lastName || null,
        })
        .eq('id', userId);
      ```

    - Wrap in `try/catch` and log; do **not** block the UI if it fails.

- **Constraints**:
  - Never overwrite existing non-empty `first_name` / `last_name`.
  - Only run this once per user (in practice, it will naturally be a no-op after first success).

#### Step 5 — Sanity-check role-switch flows

- **Files to review**:
  - `web/src/services/roleSwitchService.ts`
  - `web/src/pages/BuyerOnboardingPage.tsx`
  - `web/src/components/BuyerAuthModal.tsx`
- **Checks**:
  - Ensure role-switch entry points that “upgrade” a user to buyer call either:
    - `initializeBuyerProfile`, or
    - A flow that eventually calls `deriveBuyerName` when setting `useBuyerStore` profile.
  - Ensure we are not introducing any second, divergent name derivation logic.

### 5. QA Plan

#### Scenario A — Pure buyer login (no seller)

1. **Existing buyer with `first_name` / `last_name` set in `profiles`**:
   - Login via email/password.
   - Expected:
     - Header: `Hi, <first_name>`.
     - Buyer profile page: shows `<first_name> <last_name>`.
2. **Buyer with empty `first_name` / `last_name`, email `buyer1@gmail.com`**:
   - Login via email/password.
   - Expected:
     - Header: `Hi, buyer1`.
     - Buyer profile page: Name = `buyer1` (or derived from legacy full_name if present).

#### Scenario B — Buyer → Seller → Buyer (current bug path)

Use an account with:
- `profiles.first_name` / `last_name` empty.
- Valid `buyer` + `seller` roles and records.

Steps:

1. Login as **buyer** via email/password.
   - Verify buyer header shows `buyer1` (or expected derived name).
2. Click **Switch to Seller Mode**, complete any onboarding/redirect as needed.
3. From seller UI, click **Switch to Buyer Mode**.
4. Expected after fix:
   - Buyer header still shows `buyer1` (or better, `First Last` if profile exists).
   - Buyer profile page still has a non-empty name.

#### Scenario C — Backfill verification (optional step)

1. After Scenario B, query DB:

   ```sql
   select first_name, last_name
   from profiles
   where email = 'buyer1@gmail.com';
   ```

2. Expected:
   - `first_name` and `last_name` now set sensibly if backfill is enabled.

### 6. Rollback Strategy (for this change only)

- Changes are confined to:
  - `BuyerLoginPage.tsx` (if we route it through the helper).
  - `buyerStore.ts` (helper + `initializeBuyerProfile` usage, optional profile backfill).
- **Rollback options**:
  - If anything misbehaves, revert the helper usage in `initializeBuyerProfile` only, keeping the login behavior:
    - Replace `deriveBuyerName` call with the previous `first_name` / `last_name` direct mapping.
  - If needed, revert the entire set of changes with a single git revert of the commit touching buyer name logic.

---

When you approve, the next step will be:
- Implement `deriveBuyerName` helper.
- Refactor `BuyerLoginPage` and `initializeBuyerProfile` to use it.
- Optionally add the profile backfill block.
