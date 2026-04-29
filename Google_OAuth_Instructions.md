# OAuth Account Linking & Authentication Rules

## 1. General Principles

* Email addresses are treated as unique user identifiers.
* Different email addresses must never be assumed to belong to the same user.
* Account linking must always require explicit user intent.

---

## 2. Google OAuth Login Flow (“Continue with Google”)

When a user signs in using Google:

* If the Google email matches an existing account:

  * Log the user into that account.

* If the Google email does NOT match any existing account:

  * Create a new account using the Google email.

* Do NOT attempt to merge or map accounts with different email addresses.

---

## 3. Account Linking Flow (“Link Google Account”)

When a user is already authenticated and chooses to link Google:

* Allow linking regardless of whether the Google email matches the account email.
* The Google identity is attached to the currently logged-in account.

---

## 4. Conflict Handling

### 4.1 Google Account Already Linked

* If the Google account is already linked to another user:

  * Block the action.
  * Display an error message:
    “This Google account is already linked to another account.”

---

### 4.2 Email Mismatch During Login

* If a user logs in with Google and the email differs from an existing account:

  * Treat it as a separate account.
  * Do NOT auto-link or merge.

* Recommended UX:

  * Inform the user:
    “This Google account is not linked to your existing account. Please log in and link it from your account settings.”

---

## 5. Security Rules

* Never automatically merge accounts with different emails.
* Never allow one OAuth identity to be linked to multiple accounts.
* Always require an authenticated session before linking accounts.

---

## 6. Recommended UX Behavior

* Clearly separate:

  * “Login with Google”
  * “Link Google Account”
* Provide user feedback for:

  * successful linking
  * linking conflicts
  * mismatched accounts

---

## 7. Implementation Scope

* Supabase configuration handles provider setup and redirects.
* All linking logic, validation, and conflict handling must be implemented in application code.
