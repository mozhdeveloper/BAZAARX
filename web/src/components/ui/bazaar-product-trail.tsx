'use client'

import { useRef } from "react"
import { ImageTrail } from "@/components/ui/image-trail"

const BazaarProductTrailDemo = () => {
  const ref = useRef<HTMLDivElement>(null)

  // Bazaar marketplace product images - diverse categories
  const bazaarProducts = [
    // Fashion & Style
    {
      url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8",
      alt: "Fashion Collection",
      category: "Fashion"
    },
    // Electronics & Tech
    {
      url: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece",
      alt: "Smartphone",
      category: "Electronics"
    },
    // Home & Living
    {
      url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7",
      alt: "Home Decor",
      category: "Home"
    },
    // Beauty & Cosmetics
    {
      url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348",
      alt: "Beauty Products",
      category: "Beauty"
    },
    // Sports & Fitness
    {
      url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b",
      alt: "Sports Equipment",
      category: "Sports"
    },
    // Books & Education
    {
      url: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570",
      alt: "Books",
      category: "Education"
    },
    // Food & Beverages
    {
      url: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445",
      alt: "Gourmet Food",
      category: "Food"
    },
    // Toys & Games
    {
      url: "https://images.unsplash.com/photo-1558060370-d644479cb6f7",
      alt: "Toys",
      category: "Toys"
    }
  ].map(item => ({
    ...item,
    url: `${item.url}?auto=format&fit=crop&w=300&q=80`
  }))

  return (
    <div className="flex w-full h-screen justify-center items-center bg-white relative overflow-hidden">
      <div className="absolute top-0 left-0 z-0 w-full h-full" ref={ref}>
        <ImageTrail containerRef={ref as React.RefObject<HTMLElement>} interval={80} rotationRange={20}>
          {bazaarProducts.map((product, index) => (
            <div
              key={index}
              className="flex relative overflow-hidden w-24 h-24 rounded-xl shadow-lg border-2 border-orange-200 hover:border-orange-400 transition-all duration-300"
            >
              <img
                src={product.url}
                alt={product.alt}
                className="object-cover absolute inset-0 hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent">
                <span className="text-white text-xs font-medium px-2 py-1 block">
                  {product.category}
                </span>
              </div>
            </div>
          ))}
        </ImageTrail>
      </div>
      
      <div className="z-10 text-center select-none">
        <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 mb-4">
          BAZAAR
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 font-medium">
          Discover Amazing Products
        </p>
        <p className="text-lg text-gray-500 mt-2">
          Move your cursor to explore our marketplace
        </p>
      </div>
      
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-orange-200 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-orange-300 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-orange-400 rounded-full blur-lg"></div>
      </div>
    </div>
  )
}

export { BazaarProductTrailDemo }