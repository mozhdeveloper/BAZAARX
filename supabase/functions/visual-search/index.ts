import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

console.log("Visual Search Edge Function loading...")

const JINA_API_KEY = Deno.env.get('JINA_API_KEY')
const JINA_URL = 'https://api.jina.ai/v1/embeddings'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Reduced product labels for zero-shot classification via CLIP (keep under 20 for API limits)
const PRODUCT_LABELS = [
  'computer mouse', 'keyboard', 'headphones', 'laptop', 'smartphone',
  'handbag', 'backpack', 'wallet', 'shoes', 'sneakers',
  'dress', 'shirt', 't-shirt', 'jewelry', 'makeup',
  'vase', 'lamp', 'chair', 'toy', 'book'
]

// Map specific labels to broader search terms
const LABEL_SEARCH_TERMS: Record<string, string[]> = {
  'computer mouse': ['mouse', 'gaming mouse', 'wireless mouse'],
  'keyboard': ['keyboard', 'mechanical keyboard'],
  'headphones': ['headphones', 'headset', 'earphones', 'earbuds'],
  'laptop': ['laptop', 'notebook', 'computer'],
  'smartphone': ['phone', 'smartphone', 'mobile'],
  'handbag': ['bag', 'handbag', 'purse'],
  'backpack': ['backpack', 'bag'],
  'wallet': ['wallet', 'purse'],
  'shoes': ['shoes', 'footwear'],
  'sneakers': ['sneakers', 'shoes', 'footwear'],
  'dress': ['dress', 'gown'],
  'shirt': ['shirt', 'blouse', 'top'],
  't-shirt': ['tshirt', 't-shirt', 'shirt'],
  'jewelry': ['jewelry', 'necklace', 'ring', 'bracelet'],
  'makeup': ['makeup', 'cosmetic', 'lipstick'],
  'vase': ['vase', 'flower vase', 'decor'],
  'lamp': ['lamp', 'light', 'lighting'],
  'chair': ['chair', 'seat', 'furniture'],
  'toy': ['toy', 'toys', 'game'],
  'book': ['book', 'books', 'reading'],
}

// Map labels to categories for filtering
const LABEL_TO_CATEGORY: Record<string, string> = {
  'computer mouse': 'Electronics', 'keyboard': 'Electronics', 'headphones': 'Electronics',
  'laptop': 'Electronics', 'smartphone': 'Electronics',
  'handbag': 'Fashion', 'backpack': 'Fashion', 'wallet': 'Fashion',
  'shoes': 'Fashion', 'sneakers': 'Fashion', 'dress': 'Fashion', 'shirt': 'Fashion',
  't-shirt': 'Fashion', 'jewelry': 'Fashion',
  'makeup': 'Beauty', 'vase': 'Home & Living', 'lamp': 'Home & Living',
  'chair': 'Home & Living', 'toy': 'Toys & Games', 'book': 'Books'
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// Capitalize first letter of each word
function capitalizeLabel(label: string): string {
  return label.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

Deno.serve(async (req) => {
  const method = req.method
  const url = req.url
  const contentLength = req.headers.get("content-length")
  
  console.log(`[REQ] ${method} ${url} | Size: ${contentLength || 'unknown'}`)
  
  // Log critical headers (but avoid logging full tokens if possible)
  const headerKeys = ["authorization", "x-client-info", "apikey", "content-type", "origin"]
  const loggedHeaders = {}
  headerKeys.forEach(k => {
    const val = req.headers.get(k)
    loggedHeaders[k] = val ? (k === "authorization" || k === "apikey" ? val.substring(0, 15) + "..." : val) : null
  })
  console.log("[HEADERS]", JSON.stringify(loggedHeaders))

  if (method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let body;
    try {
      body = await req.json()
    } catch (e) {
      console.error("Failed to parse request body:", e.message)
      return new Response(JSON.stringify({ error: 'Invalid JSON body: ' + e.message }), { status: 400, headers: corsHeaders })
    }
    const imageUrl = body.primary_image || body.imageUrl || body.image_url
    const imageBase64 = body.image_base64 || body.imageBase64 || body.base64
    
    console.log("Visual search request metadata:", {
      method: req.method,
      hasImageUrl: !!imageUrl,
      hasBase64: !!imageBase64,
      bodyKeys: Object.keys(body)
    })

    if (!imageUrl && !imageBase64) {
      console.error("Missing image payload in request body")
      return new Response(
        JSON.stringify({ error: 'Missing primary_image or image_base64' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Convert image to base64 data URI for Jina API
    let imageDataUri: string
    if (imageBase64) {
      imageDataUri = `data:image/jpeg;base64,${imageBase64}`
    } else {
      // Download image and convert to base64
      console.log("Downloading image from URL:", imageUrl?.substring(0, 100))
      try {
        const imageResponse = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BazaarVisualSearch/1.0',
            'Accept': 'image/*'
          },
          signal: AbortSignal.timeout(10000) // 10s timeout
        })
        
        if (!imageResponse.ok) {
          const errorText = await imageResponse.text().catch(() => "N/A")
          console.error(`Failed to download image: ${imageResponse.status}. Body: ${errorText.substring(0, 100)}`)
          throw new Error(`Failed to download image: ${imageResponse.status}`)
        }
        
        const imageArrayBuffer = await imageResponse.arrayBuffer()
        const uint8Array = new Uint8Array(imageArrayBuffer)
        let binary = ''
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i])
        }
        const base64 = btoa(binary)
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
        imageDataUri = `data:${contentType};base64,${base64}`
        console.log("Converted external image to base64, length:", base64.length)
      } catch (fetchError) {
        console.error("Image fetch network error:", fetchError.message)
        throw new Error("Image download failed: " + fetchError.message)
      }
    }

    const imageInput = { image: imageDataUri }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    let detectedItem: string | null = null
    let detectedCategory: string | null = null
    let confidence: number = 0

    if (JINA_API_KEY) {
      try {
        console.log("Processing image with Jina AI CLIP...")
        
        // Get embeddings for both image AND text labels in one call
        // This enables zero-shot classification
        const embeddingInputs = [
          imageInput,
          ...PRODUCT_LABELS.map(label => ({ text: `a photo of a ${label}` }))
        ]

        const jinaResponse = await fetch(JINA_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${JINA_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'jina-clip-v2',
            input: embeddingInputs
          })
        })

        console.log("Jina response status:", jinaResponse.status)
        
        if (jinaResponse.ok) {
          const jinaData = await jinaResponse.json()
          const embeddings = jinaData.data?.map((d: any) => d.embedding) || []
          
          if (embeddings.length > 1) {
            const imageEmbedding = embeddings[0]
            const labelEmbeddings = embeddings.slice(1)
            
            console.log("Got embeddings from Jina. Image vector length:", imageEmbedding?.length)
            
            // Calculate similarity between image and each label
            const similarities = labelEmbeddings.map((labelEmb: number[], idx: number) => ({
              label: PRODUCT_LABELS[idx],
              similarity: cosineSimilarity(imageEmbedding, labelEmb)
            }))
            
            // Sort by similarity and get top match
            similarities.sort((a, b) => b.similarity - a.similarity)
            const topMatch = similarities[0]
            
            if (topMatch.similarity > 0.20) {
              detectedItem = capitalizeLabel(topMatch.label)
              detectedCategory = LABEL_TO_CATEGORY[topMatch.label] || null
              confidence = topMatch.similarity
              console.log(`Detected: ${detectedItem} (${(confidence * 100).toFixed(1)}%)`)
            }

            // Step 2: Search for products using vector similarity
            console.log("Calling match_products RPC...")
            const { data: vectorProducts, error: vectorError } = await supabase.rpc('match_products', {
              query_embedding: imageEmbedding,
              match_threshold: 0.10,
              match_count: 50
            })

            if (vectorError) {
              console.error("Vector search RPC error:", vectorError.message)
            } else {
              console.log("Vector RPC found:", vectorProducts?.length || 0)
            }

            // Step 3: Also do text search using detected item
            let textProducts: any[] = []
            if (detectedItem) {
              const searchTerms = LABEL_SEARCH_TERMS[topMatch.label] || [topMatch.label]
              console.log("Text search terms:", searchTerms)
              
              const filters = searchTerms.flatMap(term => [
                `name.ilike.%${term}%`,
                `description.ilike.%${term}%`
              ])
              
              const { data: textData, error: textError } = await supabase
                .from('products')
                .select('id, name, price, description')
                .is('deleted_at', null)
                .or(filters.join(','))
                .limit(50)
              
              if (textError) {
                console.error("Text search error:", textError.message)
              } else {
                textProducts = (textData || []).map(p => ({ 
                  ...p, 
                  similarity: 0.85, 
                  source: 'text' 
                }))
                console.log("Text search matches:", textProducts.length)
              }
            }

            // Step 4: Combine and rank results
            const allProducts = [...textProducts]
            if (vectorProducts) {
              for (const vp of vectorProducts) {
                if (!allProducts.find(p => p.id === vp.id)) {
                  allProducts.push({ ...vp, source: 'vector' })
                }
              }
            }

            console.log("Total unique candidates for ranking:", allProducts.length)

            if (allProducts.length > 0) {
              const productIds = allProducts.map(p => p.id)
              console.log("Enriching category data for ranking...")
              const { data: productsWithDetails } = await supabase
                .from('products')
                .select('id, name, category:categories!products_category_id_fkey(name)')
                .in('id', productIds)

              if (productsWithDetails) {
                const detailsMap = new Map(productsWithDetails.map(p => [p.id, { 
                  categoryName: p.category?.name,
                  productName: p.name
                }]))
                
                allProducts.forEach(p => {
                  const details = detailsMap.get(p.id)
                  let score = p.similarity || 0
                  if (p.source === 'text') score += 0.5
                  if (details?.categoryName === detectedCategory) score += 0.2
                  if (detectedItem && details?.productName?.toLowerCase().includes(detectedItem.toLowerCase().split(' ')[0])) {
                    score += 0.3
                  }
                  p.rankScore = score
                })
                
                allProducts.sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0))
              }
            }

            console.log("Final product count:", allProducts.length)
            return new Response(
              JSON.stringify({ 
                products: allProducts, 
                source: 'ai',
                detectedItem,
                detectedCategory,
                confidence: Math.round(confidence * 100)
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        } else {
          const errorText = await jinaResponse.text()
          console.error("Jina API error:", jinaResponse.status, errorText)
        }
      } catch (aiError) {
        console.error("AI processing catch block:", aiError.message)
      }
    } else {
      console.log("JINA_API_KEY missing from environment")
    }

    // Fallback: Return recent products
    console.log("Using fallback: returning recent products")
    const { data: fallbackProducts, error: fallbackError } = await supabase
      .from('products')
      .select('id, name, description, price, category_id, seller_id')
      .is('deleted_at', null)
      .is('disabled_at', null)
      .order('created_at', { ascending: false })
      .limit(10)

    if (fallbackError) {
      return new Response(
        JSON.stringify({ products: [], error: fallbackError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Add images
    const productIds = fallbackProducts?.map(p => p.id) || []
    if (productIds.length > 0) {
      const { data: images } = await supabase
        .from('product_images')
        .select('product_id, image_url')
        .in('product_id', productIds)
        .eq('is_primary', true)

      const productsWithImages = fallbackProducts?.map(p => ({
        ...p,
        primary_image: images?.find(img => img.product_id === p.id)?.image_url || null,
        similarity: 0.5
      }))

      return new Response(
        JSON.stringify({ 
          products: productsWithImages || [], 
          source: 'fallback',
          detectedItem,
          detectedCategory
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ products: [], source: 'fallback' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Visual search error:", error)
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message, products: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
