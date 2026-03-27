# Email Confirmation Setup Guide

## Current Status
✅ **Confirmation email template created**: `supabase/email-templates/confirm-signup.html`

The template follows the same design pattern as the password reset email and includes:
- Professional BazaarX branding
- Clear call-to-action button
- Fallback link for email clients that don't support button styling
- Explanation of why email verification is important
- 24-hour expiration notice

## To Enable Email Confirmations

### Step 1: Go to Supabase Dashboard
1. Navigate to https://supabase.com/dashboard/project/ijdpbfrcvdflzwytxncj
2. Go to **Authentication → Providers**
3. Locate **Email** provider

### Step 2: Configure Email Settings
1. Under "Email" provider, find **Confirm signup**
2. **Enable** the "Confirm signup" toggle
3. This makes email verification mandatory before users can use their accounts

### Step 3: Redirect Configuration (Optional but Recommended)
1. In **Authentication → URL Configuration**
2. Add your allowed redirect URLs:
   - Production: `https://yourdomain.com/auth/callback`
   - Local development: `http://localhost:5173/auth/callback`

### Step 4: Update Signup Flow (Optional Enhancement)
To improve UX during signup, consider:
1. Show a "Check your email" message after signup
2. Provide a resend confirmation link if user doesn't receive email

## How It Works
1. User signs up with email/password
2. Supabase automatically sends confirmation email using the template
3. User clicks link in email to verify
4. Account becomes fully active
5. User can then login and use the platform

## Template Variables Available
- `{{ .ConfirmationURL }}` - The verification link
- `{{ .Email }}` - The user's email address
- `{{ .Data }}` - Custom data fields from signup

## Testing Confirmation Flow
1. Sign up with a test email
2. Check email inbox for confirmation
3. Click link to activate account
4. Should be redirected to buyer-onboarding (new buyer) or success page

## Disable Email Confirmation (If Needed Later)
- Go back to **Authentication → Providers → Email**
- Toggle off "Confirm signup"
- Users can immediately use accounts after signup
