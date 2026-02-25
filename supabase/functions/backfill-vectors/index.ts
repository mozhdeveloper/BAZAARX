// supabase/functions/backfill-vectors/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const JINA_API_KEY = Deno.env.get('JINA_API_KEY')
// Using Jina AI CLIP for image embeddings (free tier available)
const JINA_URL = 'https://api.jina.ai/v1/embeddings'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  if (!JINA_API_KEY) {
    return new Response(JSON.stringify({ 
      error: 'JINA_API_KEY not configured',
      note: 'Visual search will use fallback mode (recent products)'
    }), { status: 200 })
  }

  // 1. Get all products with NO embedding (join with product_images to get primary image)
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id, 
      name,
      product_images!inner (
        image_url,
        is_primary
      )
    `)
    .is('image_embedding', null)
    .eq('product_images.is_primary', true)
    .limit(5) // Process 5 at a time to avoid timeouts

  if (error) {
    console.error("Supabase Query Error:", error)
    return new Response(JSON.stringify({ 
      error: error.message, 
      details: error.details 
    }), { status: 500 })
  }
  
  if (!products || products.length === 0) {
    return new Response(JSON.stringify({ message: "All caught up! No products need embedding." }), { status: 200 })
  }

  console.log(`Processing ${products.length} products...`)
  const results = []

  // 2. Loop through them and generate vectors
  for (const product of products) {
    console.log(`Processing: ${product.name}`)
    
    // Get the primary image URL from the joined product_images
    const imageUrl = product.product_images?.[0]?.image_url
    if (!imageUrl) {
      results.push({ id: product.id, name: product.name, status: "Skipped", reason: "No primary image" })
      continue
    }
    
    try {
      console.log(`  Image URL: ${imageUrl.substring(0, 60)}...`)
      
      // Call Jina AI with image URL directly (no need to fetch bytes!)
      const jinaResponse = await fetch(JINA_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${JINA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'jina-clip-v2',
          input: [{ image: imageUrl }]
        })
      })

      console.log(`  Jina AI status: ${jinaResponse.status}`)
      
      if (!jinaResponse.ok) {
        const errorText = await jinaResponse.text()
        console.error(`  Jina AI error: ${errorText.substring(0, 200)}`)
        results.push({ id: product.id, name: product.name, status: "Failed", reason: `API error: ${jinaResponse.status}` })
        continue
      }

      const jinaData = await jinaResponse.json()
      
      // Extract embedding from Jina response
      const vector = jinaData.data?.[0]?.embedding

      if (vector && vector.length > 0) {
        console.log(`  Got embedding with ${vector.length} dimensions`)
        
        // Update the row with embedding
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_embedding: vector })
          .eq('id', product.id)
        
        if (updateError) {
          console.error(`  Update failed: ${updateError.message}`)
          results.push({ id: product.id, name: product.name, status: "UpdateFailed", error: updateError.message })
        } else {
          results.push({ id: product.id, name: product.name, status: "Updated", dimensions: vector.length })
        }
      } else {
        console.error(`  No embedding in response:`, JSON.stringify(jinaData).substring(0, 200))
        results.push({ id: product.id, name: product.name, status: "Failed", reason: jinaData.error || "No embedding returned" })
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300))
      
    } catch (err) {
      console.error(`  Error: ${err.message}`)
      results.push({ id: product.id, name: product.name, status: "Error", msg: err.message })
    }
  }

  const successCount = results.filter(r => r.status === "Updated").length
  const failCount = results.filter(r => r.status !== "Updated").length

  return new Response(JSON.stringify({ 
    summary: { total: products.length, success: successCount, failed: failCount },
    processed: results 
  }), { headers: { "Content-Type": "application/json" } })
})