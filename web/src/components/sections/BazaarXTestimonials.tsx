"use client";
import { motion } from "framer-motion";
import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1";

const testimonials = [
  {
    text: "BazaarX transformed my small business! From 50 orders/month to 500+ orders. The dashboard is so easy to use, even my lola can manage it. Salamat BazaarX! 🇵🇭",
    image: "https://randomuser.me/api/portraits/women/1.jpg",
    name: "Maria Santos",
    role: "Fashion Accessories Seller",
    platform: "Google",
    rating: 5,
  },
  {
    text: "Best decision for my online store! Real-time inventory tracking saved me from overselling. Customer support responds in minutes. Highly recommended for Filipino sellers!",
    image: "https://randomuser.me/api/portraits/men/2.jpg",
    name: "Juan dela Cruz",
    role: "Electronics Shop Owner",
    platform: "Facebook",
    rating: 5,
  },
  {
    text: "I started selling from home, now I ship nationwide! BazaarX made it possible. The analytics helped me understand my customers better. Ang galing! 💯",
    image: "https://randomuser.me/api/portraits/women/3.jpg",
    name: "Liza Reyes",
    role: "Handmade Crafts Seller",
    platform: "Google",
    rating: 5,
  },
  {
    text: "Smooth setup, powerful features. I launched my store in 30 minutes! Already got my first 100 orders in 2 weeks. BazaarX is a game-changer for Filipino entrepreneurs.",
    image: "https://randomuser.me/api/portraits/men/4.jpg",
    name: "Carlos Mendoza",
    role: "Food & Beverages",
    platform: "Facebook",
    rating: 5,
  },
  {
    text: "The seller dashboard is incredible! I can track everything from sales to customer reviews. My revenue doubled in 3 months. Best platform for local sellers! 🚀",
    image: "https://randomuser.me/api/portraits/women/5.jpg",
    name: "Grace Tan",
    role: "Beauty Products Seller",
    platform: "Google",
    rating: 5,
  },
  {
    text: "BazaarX helped me reach customers from Luzon to Mindanao! The shipping integration is seamless. I now have 500+ 5-star reviews. Highly recommend to all sellers!",
    image: "https://randomuser.me/api/portraits/women/6.jpg",
    name: "Ana Lopez",
    role: "Home Decor Store",
    platform: "Facebook",
    rating: 5,
  },
  {
    text: "Free seller tools, zero setup fees! I went from 0 to ₱100K in sales within 2 months. The BazaarX team really supports small businesses. Maraming salamat! 🙏",
    image: "https://randomuser.me/api/portraits/men/7.jpg",
    name: "Miguel Ramos",
    role: "Gadgets & Tech Seller",
    platform: "Google",
    rating: 5,
  },
  {
    text: "Amazing platform! The real-time notifications keep me updated on every order. Customer trust increased with verified seller badge. My sales tripled! 📈",
    image: "https://randomuser.me/api/portraits/women/8.jpg",
    name: "Sofia Cruz",
    role: "Filipino Handicrafts",
    platform: "Facebook",
    rating: 5,
  },
  {
    text: "Best e-commerce platform in PH! Easy inventory management, quick payouts, and responsive support. Went from part-time to full-time seller thanks to BazaarX! 💪",
    image: "https://randomuser.me/api/portraits/men/9.jpg",
    name: "Rafael Garcia",
    role: "Sports & Fitness",
    platform: "Google",
    rating: 5,
  },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

export default function BazaarXTestimonials() {
  return (
    <section className="bg-gradient-to-b from-white to-orange-50/30 py-20 relative">
      <div className="container z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-[640px] mx-auto"
        >
          <div className="flex justify-center">
            <div className="border border-orange-200 bg-orange-50 text-orange-700 py-1 px-4 rounded-lg text-sm font-medium">
              Testimonials
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mt-5 text-gray-900 text-center">
            Trusted by Filipino Sellers
          </h2>
          <p className="text-center mt-5 text-gray-600 text-lg">
            Join thousands of successful sellers who grew their business with BazaarX. 
            Real reviews from Google and Facebook.
          </p>
        </motion.div>

        <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn
            testimonials={secondColumn}
            className="hidden md:block"
            duration={19}
          />
          <TestimonialsColumn
            testimonials={thirdColumn}
            className="hidden lg:block"
            duration={17}
          />
        </div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto"
        >
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-orange-600">4.9/5</div>
            <div className="text-sm text-gray-600 mt-1">Google Rating</div>
          </div>
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-orange-600">15K+</div>
            <div className="text-sm text-gray-600 mt-1">Happy Sellers</div>
          </div>
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-orange-600">4.8/5</div>
            <div className="text-sm text-gray-600 mt-1">Facebook Reviews</div>
          </div>
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-orange-600">₱2.5M</div>
            <div className="text-sm text-gray-600 mt-1">Daily Transactions</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
