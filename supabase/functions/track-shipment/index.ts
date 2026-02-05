import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const AFTERSHIP_API_KEY = Deno.env.get("AFTERSHIP_API_KEY");
const AFTERSHIP_API_URL = "https://api.aftership.com/tracking/2026-01/trackings";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { trackingNumber, carrierCode = "ninjava" } = await req.json();

    if (!trackingNumber) {
      return new Response(
        JSON.stringify({ error: "Tracking number is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!AFTERSHIP_API_KEY) {
      console.error("AFTERSHIP_API_KEY is not set");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const url = `${AFTERSHIP_API_URL}/${carrierCode}/${trackingNumber}`;

    console.log(`🔍 Fetching tracking from AfterShip: ${trackingNumber}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "aftership-api-key": AFTERSHIP_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("AfterShip API Error:", errorData);

      if (response.status === 404) {
        return new Response(
          JSON.stringify({
            error: `Tracking number "${trackingNumber}" not found. Please verify the number.`,
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: `AfterShip API Error: ${response.status} ${response.statusText}`,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();

    console.log("✅ Tracking data received");

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Tracking error:", errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
