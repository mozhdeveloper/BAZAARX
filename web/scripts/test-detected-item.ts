import 'dotenv/config'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!

async function testDetectedItem() {
  console.log('============================================================')
  console.log('🔬 VISUAL SEARCH - DETECTED ITEM TEST')
  console.log('============================================================\n')

  const testImages = [
    { name: 'Computer Mouse', url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400' },
    { name: 'Headphones', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' },
    { name: 'Leather Bag', url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400' },
    { name: 'Lipstick', url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400' },
    { name: 'Watch', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400' },
  ]

  for (const test of testImages) {
    console.log(`\n📸 Testing: ${test.name}`)
    console.log(`   URL: ${test.url.substring(0, 50)}...`)
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/visual-search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ primary_image: test.url })
      })

      if (!response.ok) {
        console.log(`   ❌ HTTP ${response.status}`)
        continue
      }

      const result = await response.json()
      
      console.log(`   Source: ${result.source}`)
      
      if (result.detectedItem) {
        console.log(`   🎯 AI Detected Item: "${result.detectedItem}"`)
      } else {
        console.log(`   ⚠️ No item detected`)
      }
      
      if (result.detectedCategory) {
        console.log(`   📁 AI Detected Category: "${result.detectedCategory}"`)
      }
      
      console.log(`   Found ${result.products?.length || 0} products`)
      
      if (result.products?.length > 0) {
        result.products.slice(0, 3).forEach((p: any, i: number) => {
          const sim = p.similarity ? ` (${(p.similarity * 100).toFixed(1)}%)` : ''
          console.log(`   ${i + 1}. ${p.name}${sim}`)
        })
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`)
    }
  }

  console.log('\n============================================================')
  console.log('Test complete!')
  console.log('============================================================')
}

testDetectedItem().catch(console.error)
