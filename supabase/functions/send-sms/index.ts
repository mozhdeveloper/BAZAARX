/**
 * Edge Function: send-sms
 *
 * SMS notification sender with provider abstraction layer.
 * Currently operates in "API-ready" mode — logs all SMS requests
 * to sms_logs with status='disabled' when no provider is configured.
 *
 * When an SMS provider is connected, set the SUPABASE secret:
 *   SMS_PROVIDER = "semaphore" | "twilio" | "vonage"
 *   + provider-specific API keys
 *
 * Request body:
 * {
 *   to: string;          // Phone number (E.164 or local PH format)
 *   message: string;     // SMS body (max 160 chars per segment)
 *   event_type: string;  // Notification event type
 *   recipient_id?: string;
 *   metadata?: Record<string, any>;
 * }
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// SMS Provider Interface
// ---------------------------------------------------------------------------

interface SMSResult {
  id: string;
  status: "sent" | "failed" | "disabled";
  error?: string;
}

interface SMSProvider {
  name: string;
  send(to: string, message: string): Promise<SMSResult>;
}

// ---------------------------------------------------------------------------
// Provider Implementations
// ---------------------------------------------------------------------------

/** Noop provider — logs but does not send. Active when no provider is configured. */
class NoopProvider implements SMSProvider {
  name = "none";
  async send(_to: string, _message: string): Promise<SMSResult> {
    return { id: "noop", status: "disabled" };
  }
}

/** Semaphore — Philippine local SMS gateway (https://semaphore.co) */
class SemaphoreProvider implements SMSProvider {
  name = "semaphore";
  private apiKey: string;
  private senderName: string;

  constructor() {
    this.apiKey = Deno.env.get("SEMAPHORE_API_KEY") || "";
    this.senderName = Deno.env.get("SEMAPHORE_SENDER_NAME") || "BazaarX";
  }

  async send(to: string, message: string): Promise<SMSResult> {
    if (!this.apiKey) {
      return { id: "", status: "failed", error: "SEMAPHORE_API_KEY not configured" };
    }

    const response = await fetch("https://api.semaphore.co/api/v4/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: this.apiKey,
        number: to,
        message,
        sendername: this.senderName,
      }),
    });

    const result = await response.json();

    if (response.ok && Array.isArray(result) && result.length > 0) {
      return { id: String(result[0].message_id || ""), status: "sent" };
    }
    return {
      id: "",
      status: "failed",
      error: result.message || JSON.stringify(result),
    };
  }
}

/** Twilio — International SMS (https://twilio.com) */
class TwilioProvider implements SMSProvider {
  name = "twilio";
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
    this.authToken = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
    this.fromNumber = Deno.env.get("TWILIO_FROM_NUMBER") || "";
  }

  async send(to: string, message: string): Promise<SMSResult> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      return { id: "", status: "failed", error: "Twilio credentials not configured" };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const credentials = btoa(`${this.accountSid}:${this.authToken}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: this.fromNumber,
        Body: message,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      return { id: result.sid || "", status: "sent" };
    }
    return {
      id: "",
      status: "failed",
      error: result.message || JSON.stringify(result),
    };
  }
}

/** Vonage / Nexmo — International SMS (https://vonage.com) */
class VonageProvider implements SMSProvider {
  name = "vonage";
  private apiKey: string;
  private apiSecret: string;
  private from: string;

  constructor() {
    this.apiKey = Deno.env.get("VONAGE_API_KEY") || "";
    this.apiSecret = Deno.env.get("VONAGE_API_SECRET") || "";
    this.from = Deno.env.get("VONAGE_FROM") || "BazaarX";
  }

  async send(to: string, message: string): Promise<SMSResult> {
    if (!this.apiKey || !this.apiSecret) {
      return { id: "", status: "failed", error: "Vonage credentials not configured" };
    }

    const response = await fetch("https://rest.nexmo.com/sms/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: this.apiKey,
        api_secret: this.apiSecret,
        to,
        from: this.from,
        text: message,
      }),
    });

    const result = await response.json();

    if (result.messages?.[0]?.status === "0") {
      return { id: result.messages[0]["message-id"] || "", status: "sent" };
    }
    return {
      id: "",
      status: "failed",
      error: result.messages?.[0]?.["error-text"] || JSON.stringify(result),
    };
  }
}

// ---------------------------------------------------------------------------
// Provider Factory
// ---------------------------------------------------------------------------

function getProvider(): SMSProvider {
  const providerName = (Deno.env.get("SMS_PROVIDER") || "none").toLowerCase();
  switch (providerName) {
    case "semaphore":
      return new SemaphoreProvider();
    case "twilio":
      return new TwilioProvider();
    case "vonage":
    case "nexmo":
      return new VonageProvider();
    default:
      return new NoopProvider();
  }
}

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

interface RequestBody {
  to: string;
  message: string;
  event_type: string;
  recipient_id?: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body: RequestBody = await req.json();
    const { to, message, event_type, recipient_id, metadata } = body;

    if (!to || !message || !event_type) {
      return jsonResponse({ error: "to, message, and event_type are required" }, 400);
    }

    // Check if SMS is enabled for this event type
    const { data: setting } = await supabase
      .from("notification_settings")
      .select("is_enabled")
      .eq("channel", "sms")
      .eq("event_type", event_type)
      .single();

    if (setting && !setting.is_enabled) {
      await logSMS(supabase, {
        to,
        message,
        event_type,
        recipient_id,
        status: "disabled",
        provider: "none",
        metadata,
      });
      return jsonResponse({ sent: false, reason: "SMS notifications disabled for this event" });
    }

    // Get the configured provider and send
    const provider = getProvider();
    const result = await provider.send(to, message);

    await logSMS(supabase, {
      to,
      message,
      event_type,
      recipient_id,
      status: result.status,
      provider: provider.name,
      provider_message_id: result.id !== "noop" ? result.id : undefined,
      error_message: result.error,
      metadata,
    });

    if (result.status === "disabled") {
      console.log(`[send-sms] SMS provider not configured — logged as disabled for ${event_type}`);
      return jsonResponse({
        sent: false,
        reason: "SMS provider not configured. SMS is API-ready — configure SMS_PROVIDER secret to enable.",
        provider: provider.name,
      });
    }

    if (result.status === "sent") {
      console.log(`[send-sms] Sent ${event_type} SMS to ${to} via ${provider.name}`);
      return jsonResponse({ sent: true, provider: provider.name, message_id: result.id });
    }

    console.error(`[send-sms] Failed: ${result.error}`);
    return jsonResponse({ sent: false, error: result.error }, 500);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[send-sms] Unhandled error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function logSMS(
  supabase: ReturnType<typeof createClient>,
  params: {
    to: string;
    message: string;
    event_type: string;
    recipient_id?: string;
    status: string;
    provider: string;
    provider_message_id?: string;
    error_message?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("sms_logs").insert({
    recipient_phone: params.to,
    recipient_id: params.recipient_id || null,
    event_type: params.event_type,
    message_body: params.message,
    status: params.status,
    provider: params.provider,
    provider_message_id: params.provider_message_id || null,
    error_message: params.error_message || null,
    metadata: params.metadata || {},
  });

  if (error) {
    console.error("[send-sms] Failed to log SMS:", error.message);
  }
}

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
