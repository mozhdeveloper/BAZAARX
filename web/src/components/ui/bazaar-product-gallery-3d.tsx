import BazaarInfiniteGallery from "./bazaar-3d-gallery";

export default function BazaarProductGallery3D() {
  // Variety of general products available on Bazaar
  const bazaarProductImages = [
    { 
      src: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&auto=format&fit=crop&q=60', 
      alt: 'Electronics & Technology' 
    },
    { 
      src: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=600&auto=format&fit=crop&q=60', 
      alt: 'Fashion & Clothing' 
    },
    { 
      src: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop&q=60', 
      alt: 'Home & Furniture' 
    },
    { 
      src: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&auto=format&fit=crop&q=60', 
      alt: 'Beauty & Personal Care' 
    },
    { 
      src: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&auto=format&fit=crop&q=60', 
      alt: 'Sports & Fitness' 
    },
    { 
      src: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&auto=format&fit=crop&q=60', 
      alt: 'Food & Beverages' 
    },
    { 
      src: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&auto=format&fit=crop&q=60', 
      alt: 'Books & Media' 
    },
    { 
      src: 'https://images.unsplash.com/photo-1415369629372-26f2fe60c467?w=600&auto=format&fit=crop&q=60', 
      alt: 'Pet Supplies' 
    },
    { 
      src: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&auto=format&fit=crop&q=60', 
      alt: 'Home Decor' 
    },
    { 
      src: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&auto=format&fit=crop&q=60', 
      alt: 'Accessories & Jewelry' 
    }
  ];

  return (
    <div className="relative w-full h-[60vh] bg-white overflow-hidden">
      {/* 3D Gallery */}
      <BazaarInfiniteGallery
        images={bazaarProductImages}
        speed={1.0}
        visibleCount={10}
        className="h-full w-full"
        fadeSettings={{
          fadeIn: { start: 0.05, end: 0.25 },
          fadeOut: { start: 0.75, end: 0.95 },
        }}
        blurSettings={{
          blurIn: { start: 0.0, end: 0.1 },
          blurOut: { start: 0.9, end: 1.0 },
          maxBlur: 5.0,
        }}
      />
      
      {/* Overlay Content */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-center px-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className="font-bold text-4xl md:text-6xl lg:text-7xl tracking-tight text-black">
            <span className="block">Buy Whatever</span>
            <span className="block text-[#FF6A00]">You Want Here</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Discover products and everything you need on Bazaar
          </p>
        </div>
      </div>

      {/* Bottom Instructions */}
      <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
        <p className="text-xs font-medium text-gray-500 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full inline-block shadow-sm">
          Use mouse wheel or arrow keys to browse products
        </p>
      </div>
    </div>
  );
}