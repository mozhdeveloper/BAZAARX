"use client";
import { TimelineContent } from "@/components/ui/timeline-animation";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// 1. Move your data into an array
const TESTIMONIALS = [
  {
    name: "Ana Gonzales",
    role: "Owner of Gourmet Manila",
    quote: "BazaarX's seller dashboard is incredibly powerful. We manage 10+ product lines effortlessly. Customer support is outstanding!",
    img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=761&auto=format&fit=crop"
  },
  {
    name: "Patricia Santos",
    role: "CEO of PatSan Fashion",
    quote: "BazaarX transformed how we sell online. From 100 to 5,000 orders per month in just 6 months. The platform is built for Filipino businesses!",
    img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=688&auto=format&fit=crop"
  },
  {
    name: "Mark Reyes",
    role: "Founder of TechHub PH",
    quote: "Best investment for my online store. Real-time analytics helped us triple our revenue!",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=687&auto=format&fit=crop"
  }
];

function BrandTestimonials() {
  const [index, setIndex] = useState(0);
  const testimonialRef = useRef<HTMLDivElement>(null);

  // Handlers for arrows
  const next = () => setIndex((prev) => (prev + 1) % TESTIMONIALS.length);
  const prev = () => setIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);

  return (
    <main className="w-full bg-[#fdf8f4] py-20 overflow-hidden">
      <section className="container mx-auto px-6 flex flex-col lg:flex-row items-center gap-12" ref={testimonialRef}>
        
        {/* LEFT COLUMN: STATIC CONTENT */}
        <div className="lg:w-2/5 space-y-6">
          <TimelineContent as="span" animationNum={0} timelineRef={testimonialRef} className="text-[#ff8555] font-bold tracking-widest text-sm uppercase">
            Testimonials
          </TimelineContent>
          <h2 className="text-5xl lg:text-6xl font-extrabold text-[#1a2b3b] leading-tight">
            Trusted by Leading <br />
            <span className="text-[#ff8555]">Filipino Brands</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-md">
            See what business owners and entrepreneurs say about BazaarX.
          </p>

          <div className="flex gap-4 pt-4">
            <button onClick={prev} className="p-4 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-all active:scale-95 shadow-sm">
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <button onClick={next} className="p-4 rounded-full bg-[#ff8555] hover:bg-[#ff703d] transition-all active:scale-95 shadow-lg shadow-orange-200">
              <ArrowRight className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: ANIMATED CARD */}
        <div className="lg:w-3/5 relative flex items-center justify-center lg:justify-start">
          <div className="relative w-full max-w-xl min-h-[400px] flex items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white p-10 rounded-3xl shadow-xl shadow-gray-200/50 w-full z-10"
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-[#ff8555] text-[#ff8555]" />
                  ))}
                </div>

                <blockquote className="text-xl text-gray-700 leading-relaxed mb-8 italic min-h-[120px]">
                  "{TESTIMONIALS[index].quote}"
                </blockquote>

                <div className="flex items-center gap-4">
                  <img
                    src={TESTIMONIALS[index].img}
                    alt={TESTIMONIALS[index].name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#ff8555]"
                  />
                  <div>
                    <h4 className="font-bold text-[#1a2b3b] text-lg leading-tight">{TESTIMONIALS[index].name}</h4>
                    <p className="text-gray-500 text-sm font-medium">{TESTIMONIALS[index].role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Pagination Dots */}
            <div className="absolute -bottom-10 left-0 flex items-center gap-2">
              {TESTIMONIALS.map((_, i) => (
                <div 
                  key={i} 
                  className={`transition-all duration-300 rounded-full h-2 ${i === index ? "w-6 bg-[#ff8555]" : "w-2 bg-gray-300"}`} 
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default BrandTestimonials;