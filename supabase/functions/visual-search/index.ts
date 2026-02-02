import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALIBABA_API_KEY = Deno.env.get('ALIBABA_API_KEY')
const ALIBABA_URL = 'https://dashscope-intl.aliyuncs.com/api/v1/services/embeddings/multimodal-embedding/multimodal-embedding'

serve(async (req) => {
  const { primary_image } = await req.json()

  if (!primary_image) {
    return new Response(JSON.stringify({ error: 'Missing primary_image' }), { status: 400 })
  }

  // 1. Call Alibaba
  const alibabaResponse = await fetch(ALIBABA_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ALIBABA_API_KEY}`,
      'Content-Type': 'application/json'
      // REMOVED: 'X-DashScope-Async' header to force Instant Mode
    },
    body: JSON.stringify({
      model: "tongyi-embedding-vision-plus",
      input: {
        contents: [
          { "image": primary_image }
        ]
      }
    })
  })

  const alibabaData = await alibabaResponse.json()

  // 2. CHECK FOR ERROR
  // Look for 'embeddings' (plural) OR 'embedding' (singular)
  const embeddingData = alibabaData.output?.embeddings?.[0]?.embedding || alibabaData.output?.embedding

  if (!embeddingData) {
    console.error("Alibaba Failed:", JSON.stringify(alibabaData))
    return new Response(JSON.stringify({ 
      error: 'Embedding failed', 
      details: alibabaData 
    }), { status: 500 })
  }

  // 3. Search Supabase
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )

  const { data: products, error } = await supabase.rpc('match_products', {
    query_embedding: embeddingData,
    match_threshold: 0.2,
    match_count: 5
  })

  return new Response(
    JSON.stringify({ products }),
    { headers: { "Content-Type": "application/json" } },
  )
})