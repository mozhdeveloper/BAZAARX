'use client';

import { ZoomParallax } from './bazaar-zoom-parallax';

const images = [
  { src: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Kashan_-_Timche-ye_Amin_od-Dowleh_-_20140512_-_JB.jpg', alt: 'center' },
  { src: 'https://www.tappersia.com/blog/wp-content/uploads/2022/08/tehran-bazaar.jpg', alt: 'Cityscape' },
  { src: 'https://surfiran.com/mag/wp-content/uploads/2024/01/Historical-Bazaar-of-Kermanshah-1.jpg', alt: 'Abstract' },
  { src: 'https://media-cdn.tripadvisor.com/media/photo-s/18/ac/c7/21/isfahan-grand-bazaar.jpg', alt: 'Mountain' },
  { src: 'https://bakuindex.ir/wp-content/uploads/2021/04/Iranian-bazaar.jpg', alt: 'Minimalist' },
  { src: 'https://incredibleiran.com/wp-content/uploads/2023/10/Yazd-Bazaar-2.jpg', alt: 'Ocean' },
  { src: 'https://thumbs.dreamstime.com/b/tehran-iran-october-grand-bazaar-best-place-to-enjoy-atmosphere-eastern-market-taste-local-sweets-nuts-feel-103623209.jpg', alt: 'Forest' },
];

export default function BazaarHistoryZoomParallax() {
  return (
    <section className="bg-white">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto text-center mb-8 overflow-visible">
  <h2
    className="inline-block text-4xl sm:text-5xl md:text-6xl lg:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent leading-tight py-2"
    style={{ backgroundImage: 'linear-gradient(180deg,#fff 0%, #f4a770 40%, var(--accent-2, #e57d45) 100%)' }}
  >
    Centers of Exchange
  </h2>

  {/* Decorative divider */}
  <div
  aria-hidden="true"
  className="w-80 h-1 rounded-full mx-auto mt-6 mb-6"
  style={{ backgroundColor: 'var(--accent-2, #FF8A4D)' }}
/>

<p className="mt-2 text-lg leading-relaxed text-[var(--text-primary)]">
  As Persia became a key crossroads of the Silk Road, bazaars evolved into international trade hubs. Goods, ideas, and traditions flowed through their arcades, supported by surrounding mosques, bathhouses, 
  schools, and caravanserais. These spaces shaped not only economic exchange, but also social interaction and political influence.
</p>
        </div>
      </div>

      {/* Parallax zoom section */}
      <div className="w-full">
        <ZoomParallax images={images} />
      </div>
    </section>
  );
}