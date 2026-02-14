import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const imageUrl = body.primary_image
    const imageBase64 = body.image_base64

    if (!imageUrl && !imageBase64) {
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
      console.log("Downloading image from URL:", imageUrl?.substring(0, 80))
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BazaarVisualSearch/1.0',
          'Accept': 'image/*'
        }
      })
      if (!imageResponse.ok) {
        console.error("Failed to download image:", imageResponse.status)
        throw new Error("Failed to download image")
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
      console.log("Converted to base64, length:", base64.length)
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
            
            console.log("Got", embeddings.length, "embeddings (1 image +", labelEmbeddings.length, "labels)")
            
            // Calculate similarity between image and each label
            const similarities = labelEmbeddings.map((labelEmb: number[], idx: number) => ({
              label: PRODUCT_LABELS[idx],
              similarity: cosineSimilarity(imageEmbedding, labelEmb)
            }))
            
            // Sort by similarity and get top match
            similarities.sort((a, b) => b.similarity - a.similarity)
            const topMatch = similarities[0]
            
            console.log("Top 5 classifications:")
            similarities.slice(0, 5).forEach((s, i) => {
              console.log(`  ${i + 1}. ${s.label}: ${(s.similarity * 100).toFixed(1)}%`)
            })
            
            // Only use classification if confidence is reasonable (> 20%)
            if (topMatch.similarity > 0.20) {
              detectedItem = capitalizeLabel(topMatch.label)
              detectedCategory = LABEL_TO_CATEGORY[topMatch.label] || null
              confidence = topMatch.similarity
              console.log(`Detected: ${detectedItem} (${(confidence * 100).toFixed(1)}%) -> Category: ${detectedCategory}`)
            }

            // Step 2: Search for products using vector similarity
            const { data: vectorProducts, error: vectorError } = await supabase.rpc('match_products', {
              query_embedding: imageEmbedding,
              match_threshold: 0.10,  // Lower threshold to get more results
              match_count: 30  // Get more to filter
            })

            if (vectorError) {
              console.error("Vector search error:", vectorError.message)
            } else {
              console.log("Vector search found:", vectorProducts?.length || 0, "products")
            }

            // Step 3: Also do text search using detected item
            let textProducts: any[] = []
            if (detectedItem) {
              const searchTerms = LABEL_SEARCH_TERMS[topMatch.label] || [topMatch.label]
              console.log("Text searching for:", searchTerms)
              
              // Build proper OR filter for multiple terms
              const filters = searchTerms.flatMap(term => [
                `name.ilike.%${term}%`,
                `description.ilike.%${term}%`
              ])
              
              const { data: textData, error: textError } = await supabase
                .from('products')
                .select('id, name, price, description')
                .is('deleted_at', null)
                .or(filters.join(','))
                .limit(15)
              
              if (textError) {
                console.error("Text search error:", textError.message)
              } else if (textData && textData.length > 0) {
                // Give text matches high priority (they directly match the detected item)
                textProducts = textData.map(p => ({ 
                  ...p, 
                  similarity: 0.85,  // High similarity for text matches
                  source: 'text' 
                }))
                console.log("Text search found:", textProducts.length, "products:", textProducts.map(p => p.name).join(', '))
              }
            }

            // Step 4: Combine and rank results
            // Priority: 1) Text matches (exact name match), 2) Same category + high similarity, 3) Other
            const allProducts = [...textProducts]
            
            // Add vector products that aren't already in text results
            if (vectorProducts) {
              for (const vp of vectorProducts) {
                if (!allProducts.find(p => p.id === vp.id)) {
                  allProducts.push({ ...vp, source: 'vector' })
                }
              }
            }

            console.log("Combined products before ranking:", allProducts.length)

            // Boost products that match the detected category and sort properly
            if (allProducts.length > 0) {
              // Get categories for all products and full product details
              const productIds = allProducts.map(p => p.id)
              const { data: productsWithDetails } = await supabase
                .from('products')
                .select('id, name, category:categories!products_category_id_fkey(name)')
                .in('id', productIds)

              if (productsWithDetails) {
                const detailsMap = new Map(productsWithDetails.map(p => [p.id, { 
                  categoryName: p.category?.name,
                  productName: p.name
                }]))
                
                // Calculate ranking score for each product
                allProducts.forEach(p => {
                  const details = detailsMap.get(p.id)
                  let score = p.similarity || 0
                  
                  // Boost for text match (already has high similarity of 0.85)
                  if (p.source === 'text') {
                    score += 0.5  // Strong boost for text matches
                  }
                  
                  // Boost for category match
                  if (details?.categoryName === detectedCategory) {
                    score += 0.2
                  }
                  
                  // Extra boost if product name contains the detected item keyword
                  if (detectedItem && details?.productName) {
                    const detectedLower = detectedItem.toLowerCase()
                    const nameLower = details.productName.toLowerCase()
                    if (nameLower.includes(detectedLower.split(' ')[0])) {  // Match first word (e.g., "mouse" from "Computer Mouse")
                      score += 0.3
                    }
                  }
                  
                  p.rankScore = score
                })
                
                // Sort by rank score descending
                allProducts.sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0))
                
                console.log("Ranked products:", allProducts.slice(0, 5).map(p => 
                  `${detailsMap.get(p.id)?.productName} (${p.rankScore?.toFixed(2)})`
                ).join(', '))
              }
            }

            // Return top 10 unique products
            const finalProducts = allProducts.slice(0, 10)
            
            if (finalProducts.length > 0) {
              console.log("Returning", finalProducts.length, "products")
              return new Response(
                JSON.stringify({ 
                  products: finalProducts, 
                  source: 'ai',
                  detectedItem,
                  detectedCategory,
                  confidence: Math.round(confidence * 100)
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
          }
        } else {
          const errorText = await jinaResponse.text()
          console.error("Jina error:", jinaResponse.status, errorText.substring(0, 200))
        }
      } catch (aiError) {
        console.error("AI search failed:", aiError.message)
      }
    } else {
      console.log("JINA_API_KEY not set")
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
