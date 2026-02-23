import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { Image } from 'https://deno.land/x/imagescript@1.2.17/mod.ts'
import { decodeBase64, encodeBase64 } from "https://deno.land/std@0.203.0/encoding/base64.ts"

const JINA_API_KEY = Deno.env.get('JINA_API_KEY')
const DASHSCOPE_API_KEY = Deno.env.get('DASHSCOPE_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log("--- BAZAARX Search v2: Optimized Start ---");

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { image_base64 } = await req.json();
    if (!image_base64) throw new Error("No image_base64 provided");

    const pureBase64 = image_base64.split(',')[1] || image_base64;
    const imageBytes = decodeBase64(pureBase64);

    // 1. Decode and IMMEDIATELY resize to save memory
    let img = await Image.decode(imageBytes);
    // Keep aspect ratio but limit max dimension to 800px
    img = img.resize(800, Image.RESIZE_AUTO); 
    const { width, height } = img;
    console.log(`Image prepared: ${width}x${height}`);

    // --- STAGE 1: Qwen-VL Detection ---
    console.log("Requesting object detection...");
    const qwenResponse = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "qwen-vl-plus",
        messages: [{
          role: "user",
          content: [
            // FIX 1: Explicitly demand strict double quotes for JSON keys
            { type: "text", text: 'Detect all distinct e-commerce products. Output ONLY a valid JSON array. You MUST use strict double quotes for all keys ("label", "bbox_2d") and string values. The labels MUST be in English. Bounding box in [x1, y1, x2, y2] thousandths format. Do not use markdown formatting.' },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${pureBase64}` } }
          ]
        }]
      })
    });

    const qwenData = await qwenResponse.json();
    let qwenContent = qwenData.choices[0].message.content;
    
    // FIX 2: Strip any markdown formatting just in case Qwen disobeys the prompt
    qwenContent = qwenContent.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const jsonMatch = qwenContent.match(/\[.*\]/s);
    if (!jsonMatch) {
      console.error("Failed to extract JSON from:", qwenContent);
      throw new Error("Invalid response format from AI");
    }
    
    const detections = JSON.parse(jsonMatch[0]);
    console.log(`Detected ${detections.length} objects.`);

    // --- STAGE 2: Cropping (Memory Efficient) ---
    const crops = [];
    for (const det of detections.slice(0, 3)) {
      const [x1, y1, x2, y2] = det.bbox_2d;
      const left = Math.max(0, Math.floor((x1 / 1000) * width));
      const top = Math.max(0, Math.floor((y1 / 1000) * height));
      const cWidth = Math.min(width - left, Math.floor(((x2 - x1) / 1000) * width));
      const cHeight = Math.min(height - top, Math.floor(((y2 - y1) / 1000) * height));

      if (cWidth > 5 && cHeight > 5) {
        const cropped = img.clone().crop(left, top, cWidth, cHeight);
        
        // FIX 1: Explicitly encode as a JPEG at 80% quality. 
        // This guarantees a valid, lightweight image format for Jina.
        const encoded = await cropped.encodeJPEG(80); 
        crops.push({
          label: det.label,
          base64: encodeBase64(encoded)
        });
      }
    }

    (img as any) = null; // Free memory

    if (crops.length === 0) throw new Error("No products detected in frame.");

    // --- STAGE 3: Jina Embeddings ---
    console.log(`Getting embeddings for ${crops.length} objects...`);
    const jinaResponse = await fetch('https://api.jina.ai/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${JINA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: 'jina-clip-v2', 
        // FIX: Changed "bytes" to "image" and added the data URI prefix 
        input: crops.map(c => ({ image: `data:image/jpeg;base64,${c.base64}` })), 
        task: 'retrieval.query' 
      })
    });
    
    const jinaData = await jinaResponse.json();

    // Catch Jina API errors safely
    if (!jinaResponse.ok || !jinaData.data) {
        console.error("Jina API Error details:", jinaData);
        throw new Error(`Jina API Error (${jinaResponse.status}): ${jinaData.detail || JSON.stringify(jinaData)}`);
    }

    // --- STAGE 4: DB Search ---
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const results = await Promise.all(jinaData.data.map(async (d: any, i: number) => {
      const { data: matches } = await supabase.rpc('match_products', {
        query_embedding: d.embedding,
        match_threshold: 0.6, 
        match_count: 50
      });
      
      // ADD THIS LOG:
      console.log(`\n--- Matches for ${crops[i].label} ---`);
      matches?.forEach((m: any) => console.log(`${m.name} | Score: ${m.similarity}`));

      return { object_label: crops[i].label, matches: matches || [] };
    }));

    return new Response(JSON.stringify({ detected_objects: results }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("CRITICAL_ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});