'use client';



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
  return (
    <section className="bg-[#D94F00] text-white">
      <div className="flex flex-col md:flex-row">
        {/* Left Section: Sticky Text */}
        <div className="w-full md:w-1/2 md:h-screen md:sticky md:top-0 flex flex-col justify-center px-6 sm:px-8 md:px-10 lg:px-16 xl:px-20 py-16 sm:py-20 md:py-0">
          <div className="max-w-xl">
            {/* Decorative vertical divider */}
            <div className="w-px h-32 sm:h-40 md:h-48 lg:h-52 bg-gradient-to-b from-transparent via-white/50 to-transparent mb-6 sm:mb-8"></div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-tight mb-6 sm:mb-8 font-fondamento text-white">
              Centers of Exchange
            </h2>

            <p className="text-base sm:text-lg md:text-xl leading-relaxed text-white/90 mb-6 sm:mb-8 text-justify">
              As Persia became a key crossroads of the Silk Road, bazaars evolved
              into international trade hubs. Goods, ideas, and traditions flowed
              through their arcades, supported by surrounding mosques,
              bathhouses, schools, and caravanserais. These spaces shaped not
              only economic exchange, but also social interaction and political
              influence.
            </p>

            {/* Decorative vertical divider */}
            <div className="w-px h-32 sm:h-40 md:h-48 lg:h-52 bg-gradient-to-b from-transparent via-white/50 to-transparent"></div>
          </div>
        </div>

        {/* Right Section: Scrollable Images */}
        <div className="w-full md:w-1/2 p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col gap-4 sm:gap-6 md:gap-8 lg:gap-12 bg-[#D94F00]">
          {images.map((image, index) => (
            <div key={index} className="w-full">
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-auto object-cover rounded-lg shadow-2xl"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}