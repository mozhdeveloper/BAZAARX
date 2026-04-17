# OTP Authentication Implementation

## Overview
Added email-based OTP (One-Time Password) authentication to the BazaarX mobile app.

## What Was Done

### 1. Added `sendOTP` Method
- Sends a one-time password to the user's email via Supabase Auth
- Returns `true` on success
- Validates Supabase configuration before attempting to send

### 2. Added `verifyOTP` Method
- Verifies the OTP code entered by the user
- Returns the authenticated user session on success
- Updates the user's `last_login_at` timestamp in the `profiles` table
- Throws descriptive errors for invalid or expired OTPs

## File Modified
```
src/services/authService.ts
```

## Usage

```typescript
import { authService } from '@/services/authService';

// Step 1: Send OTP to user's email
const sent = await authService.sendOTP('user@email.com');

// Step 2: Verify the OTP code entered by the user
const result = await authService.verifyOTP('user@email.com', '123456');

if (result) {
  // User is now authenticated
  console.log('User:', result.user);
  console.log('Session:', result.session);
}
```

## Method Signatures

### `sendOTP`
```typescript
async sendOTP(email: string): Promise<boolean>
```
| Parameter | Type | Description |
|-----------|------|-------------|
| `email` | `string` | User's email address to send OTP to |

**Returns:** `true` if OTP was sent successfully

### `verifyOTP`
```typescript
async verifyOTP(email: string, token: string): Promise<{ user: any; session: any } | null>
```
| Parameter | Type | Description |
|-----------|------|-------------|
| `email` | `string` | User's email address |
| `token` | `string` | The OTP code to verify |

**Returns:** Object containing `user` and `session`, or `null` if verification fails

## Error Handling
Both methods throw user-friendly error messages:
- `"Supabase not configured"` — when environment variables are missing
- `"Failed to send OTP. Please try again."` — when sending fails
- `"Invalid or expired OTP. Please try again."` — when verification fails

## Architecture Notes
- Follows the existing `AuthService` singleton pattern
- Uses the existing Supabase client from `src/lib/supabase.ts`
- Consistent with the error handling patterns of other auth methods (`signIn`, `signUp`, `resetPassword`)
- Updates `last_login_at` on successful OTP verification, same as password-based sign-in
