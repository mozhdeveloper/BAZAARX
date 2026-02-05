'use client';

import { motion } from 'framer-motion';

const images = [
  { src: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Kashan_-_Timche-ye_Amin_od-Dowleh_-_20140512_-_JB.jpg', alt: '1' },
  { src: 'https://www.rucksackramblings.com/wp-content/uploads/2017/01/The-Bazaars-Of-Iran-21.jpg', alt: '2' },
  { src: 'https://thumbs.dreamstime.com/b/traditional-iranian-carpets-shop-vakil-bazaar-shiraz-iran-december-most-important-tourist-72782572.jpg', alt: '3' },
  { src: 'https://springfieldmuseums.org/wp-content/uploads/2019/08/bazaar-iran.jpg', alt: '4' },
  { src: 'https://media-cdn.tripadvisor.com/media/photo-s/0f/41/ea/ab/le-spezie-del-gran-bazar.jpg', alt: '5' },
  { src: 'https://thumbs.dreamstime.com/b/bazar-teheran-iran-fruit-basar-fruits-nuits-vegetables-100839629.jpg', alt: '6' },
  { src: 'https://res.cloudinary.com/ddjuftfy2/image/upload/f_webp,c_fill/multitenacy/wikis/2025-07-14-07-16-55-16874aee722375.jpeg', alt: '7' },
  { src: 'https://vid.alarabiya.net/images/2018/07/30/446f7b7b-3d7c-4d4d-b239-5605511a9c58/446f7b7b-3d7c-4d4d-b239-5605511a9c58_16x9_1200x676.jpg', alt: '8' },
];

export default function BazaarHistoryZoomParallax() {
  // Duplicate images for seamless loop
  const carouselImages = [...images, ...images];

  return (
    <section className="bg-[#D94F00] text-white h-screen overflow-hidden">
      <div className="flex flex-col md:flex-row h-full">
        {/* Left Section: Static Text */}
        <div className="w-full md:w-1/2 h-[40%] md:h-full flex flex-col justify-center px-6 sm:px-8 md:px-10 lg:px-16 xl:px-20 py-8 md:py-0 z-10 bg-[#D94F00] shadow-xl md:shadow-none">
          <div className="max-w-xl">
            {/* Decorative vertical divider (Top) */}
            <div className="w-px h-16 sm:h-24 md:h-32 bg-gradient-to-b from-transparent via-white/50 to-transparent mb-4 sm:mb-6"></div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-tight mb-4 sm:mb-6 font-fondamento text-white">
              Centers of Exchange
            </h2>

            <p className="text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed text-white/90 mb-4 sm:mb-6 text-justify">
              As Persia became a key crossroads of the Silk Road, bazaars evolved
              into international trade hubs. Goods, ideas, and traditions flowed
              through their arcades, supported by surrounding mosques,
              bathhouses, schools, and caravanserais. These spaces shaped not
              only economic exchange, but also social interaction and political
              influence.
            </p>

            {/* Decorative vertical divider (Bottom) */}
            <div className="w-px h-16 sm:h-24 md:h-32 bg-gradient-to-b from-transparent via-white/50 to-transparent"></div>
          </div>
        </div>

        {/* Right Section: Auto-Scrolling Carousel */}
        <div className="w-full md:w-1/2 h-[60%] md:h-full relative overflow-hidden bg-[#D94F00]">
          {/* Gradients to fade edges */}
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[#D94F00] to-transparent z-10 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#D94F00] to-transparent z-10 pointer-events-none"></div>

          <motion.div
            className="flex flex-col gap-6 p-6 md:p-10"
            animate={{
              y: ["0%", "-50%"],
            }}
            transition={{
              duration: 40, // Adjust speed here (higher = slower)
              ease: "linear",
              repeat: Infinity,
            }}
          >
            {carouselImages.map((image, index) => (
              <div key={index} className="w-full shrink-0">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-64 md:h-80 lg:h-96 object-cover rounded-xl shadow-2xl hover:scale-[1.02] transition-transform duration-500"
                />
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}