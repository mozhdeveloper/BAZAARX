# Mobile Email Authentication Guide

**Project:** BazaarX Mobile
**Feature:** Email Authentication (One-Time Passwords / Magic Links / Email Confirmations)
**Status:** Architecture & Testing Reference

---

## 1. Architecture Overview

BazaarX uses **Supabase Authentication** backed by an email provider (e.g., Resend) to handle email verification and password resets. 

### How It Works Behind the Scenes
1. **Trigger:** The app requests Supabase to send an authentication email (like "Confirm Signup" or "Password Reset").
2. **Delivery:** Supabase generates a unique secure link/OTP using its internal `Site URL` configuration and sends it to the user.
3. **Redirection:** When the user clicks the link in their email:
   - The link first hits the Supabase Auth server to validate the token.
   - Supabase then immediately redirects the user to the configured **Site URL** or **Redirect URI**.

---

## 2. The "Site URL" Conundrum (Understanding Network Limitations)

In Supabase (`Authentication` -> `URL Configuration`), there is a critical setting called the **Site URL**.

### Scenario A: Site URL is a Local IP Address (e.g., `http://192.168.1.15:8081`)
During local development, developers often set the Site URL to their computer's local Wi-Fi IP address so the app works on the local network. 

**What this means for QA:**
- **Local Network Required:** If this is the setup, the QA tester **MUST** be connected to the exact same Wi-Fi network as the developer's computer.
- **Why?** Because when QA taps "Confirm Email", the browser attempts to route them to `http://192.168.1.15:8081`. If they are on Cellular Data or a different Wi-Fi, the internet cannot find that private IP address, resulting in a *"Site cannot be reached"* error.

### Scenario B: Site URL is a Deep Link (e.g., `bazaarx://`)
This is the production standard for mobile apps. When the Site URL is set to the app's native scheme (`bazaarx://`):

**What this means for QA:**
- **Network Independence:** QA can test from **anywhere in the world** using any network. 
- **Why?** Tapping the link tells the device operating system to instantly open the BazaarX app natively, bypassing browser/IP routing entirely.

### Scenario C: Site URL is an Ngrok Tunnel (e.g., `https://bazaarx.ngrok.app`)
Developers can run `npx expo start --tunnel`.

**What this means for QA:**
- QA can test from any network. The email link routes through the secure public ngrok URL directly into the developer's local machine.

---

## 3. QA Testing Guide

Follow this guide to verify email routing successfully connects the user back to the app.

### Prerequisites for the Dev Team
Before handing off to QA, developers must ensure:
1. Supabase **Site URL** is configured in a way QA can access it (Tunnel, Deep Link, or identical Wi-Fi).
2. The sender email address is verified via Resend (so emails do not go to Spam).

### Test Case 1: Standard Email Signup / Verification
**Objective:** Verify a new user can sign up and confirm their email address.
1. **Action:** Open app and navigate to Signup. Enter a test email and password.
2. **Wait:** Check email inbox for a confirmation link/OTP.
3. **Action:** Tap the confirmation link on the mobile device.
4. **Expected Result:**
   - If using Deep Links: The BazaarX app seamlessly re-opens and logs the user in.
   - If using IP/Tunnel: A browser opens briefly, says "Confirmed", and the user can return to the app to log in.

### Test Case 2: Password Reset Flow
**Objective:** Verify users can securely recover their accounts.
1. **Action:** On the Login Screen, tap "Forgot Password". Enter the test email.
2. **Wait:** Check the email inbox for the reset link.
3. **Action:** Tap the link on the mobile device. 
4. **Expected Result:** The user is redirected to the `ResetPassword` screen inside the BazaarX app to type a new password. Verify the new password successfully logs them in.

---

## 4. Troubleshooting for QA

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **"Site cannot be reached"** when clicking email link | **Network Mismatch:** Supabase is using a local IP Address (e.g. 192.168.x.x) and you are not on the same Wi-Fi. | Connect to the Dev's Wi-Fi network, or ask Dev to update the Supabase Site URL to `bazaarx://` or a tunnel. |
| **Emails are not arriving** | Emails are being sent to spam, or the Supabase email quota has been exhausted. | Check spam folder. Devs should check Supabase API logs to confirm the email dispatched successfully. |
| **Clicking link opens app but shows an error** | Token Expired or Invalid Deep Link configuration. | The email token might have expired (usually 1 hour). Request a new email and try immediately. |
