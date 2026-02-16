import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const JINA_API_KEY = 'jina_d6c2662857814ff9af2ef3224abebcc4VryLeUdgf0DRMJJ4-j_eILeo6Ojc'
const JINA_URL = 'https://api.jina.ai/v1/embeddings'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testVisualSearchComplete() {
  console.log('============================================================')
  console.log('🔬 VISUAL SEARCH COMPLETE TEST')
  console.log('============================================================\n')

  // Test image URLs
  const testImages = {
    headphones: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    handbag: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400',
    lipstick: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400',
    watch: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'
  }

  // Step 1: Test Jina AI directly
  console.log('📋 Step 1: Test Jina AI Embedding API')
  console.log('----------------------------------------')
  
  try {
    const jinaResponse = await fetch(JINA_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JINA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'jina-clip-v2',
        input: [{ image: testImages.headphones }]
      })
    })

    console.log('   Status:', jinaResponse.status)
    
    if (jinaResponse.ok) {
      const data = await jinaResponse.json()
      const embedding = data.data?.[0]?.embedding
      console.log('   ✅ Jina AI working!')
      console.log('   Dimensions:', embedding?.length || 'N/A')
      console.log('   First 5 values:', embedding?.slice(0, 5))
      
      // Step 2: Test match_products RPC with this embedding
      console.log('\n📋 Step 2: Test match_products RPC')
      console.log('----------------------------------------')
      
      const { data: products, error } = await supabase.rpc('match_products', {
        query_embedding: embedding,
        match_count: 5,
        match_threshold: 0.1
      })

      if (error) {
        console.log('   ❌ RPC Error:', error.message)
      } else {
        console.log('   ✅ RPC returned', products?.length || 0, 'products')
        products?.forEach((p: any, i: number) => {
          console.log(`   ${i+1}. ${p.name} (${(p.similarity * 100).toFixed(1)}% match)`)
        })
      }
    } else {
      const errorText = await jinaResponse.text()
      console.log('   ❌ Jina AI error:', errorText)
    }
  } catch (e: any) {
    console.log('   ❌ Jina AI failed:', e.message)
  }

  // Step 3: Test Edge Function
  console.log('\n📋 Step 3: Test Visual Search Edge Function')
  console.log('----------------------------------------')
  
  const edgeFunctionUrl = 'https://ijdpbfrcvdflzwytxncj.supabase.co/functions/v1/visual-search'
  
  try {
    const edgeResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ primary_image: testImages.headphones })
    })

    console.log('   Status:', edgeResponse.status)
    const result = await edgeResponse.json()
    console.log('   Source:', result.source || 'unknown')
    console.log('   Products:', result.products?.length || 0)
    
    if (result.source === 'ai') {
      console.log('   ✅ AI-based visual search working!')
      result.products?.slice(0, 3).forEach((p: any, i: number) => {
        console.log(`   ${i+1}. ${p.name} (${(p.similarity * 100).toFixed(1)}% match)`)
      })
    } else if (result.source === 'fallback') {
      console.log('   ⚠️ Using fallback mode (check edge function logs)')
      result.products?.slice(0, 3).forEach((p: any, i: number) => {
        console.log(`   ${i+1}. ${p.name}`)
      })
    }
    
    if (result.error) {
      console.log('   ❌ Error:', result.error)
    }
  } catch (e: any) {
    console.log('   ❌ Edge function error:', e.message)
  }

  // Step 4: Check products with embeddings
  console.log('\n📋 Step 4: Products with Embeddings')
  console.log('----------------------------------------')
  
  const { data: embeddedProducts, error: embError } = await supabase
    .from('products')
    .select('id, name, price')
    .not('image_embedding', 'is', null)
    .limit(10)

  if (embError) {
    console.log('   ❌ Query error:', embError.message)
  } else {
    console.log('   Total products with embeddings:', embeddedProducts?.length || 0)
    embeddedProducts?.forEach((p, i) => {
      console.log(`   ${i+1}. ${p.name} (₱${p.price})`)
    })
  }

  // Step 5: Summary and recommendations
  console.log('\n============================================================')
  console.log('📊 SUMMARY')
  console.log('============================================================')
  
  const embCount = embeddedProducts?.length || 0
  if (embCount < 5) {
    console.log('⚠️ Few products have embeddings. Run backfill to add more:')
    console.log('   curl -X POST https://ijdpbfrcvdflzwytxncj.supabase.co/functions/v1/backfill-vectors')
  } else {
    console.log('✅ Products have embeddings.')
  }
  
  console.log('\n🌐 Frontend Integration URLs:')
  console.log('   Edge Function: https://ijdpbfrcvdflzwytxncj.supabase.co/functions/v1/visual-search')
  console.log('   Backfill:      https://ijdpbfrcvdflzwytxncj.supabase.co/functions/v1/backfill-vectors')
}

testVisualSearchComplete().catch(console.error)
