'use client';

import { useEffect } from 'react';
import ScrollExpandMedia from '@/components/ui/scroll-expansion-hero';

const BazaarXCrossroadsHero = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    window.dispatchEvent(new Event('resetSection'));
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <ScrollExpandMedia
        mediaType="image"
        mediaSrc="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmZuouK6m6ZrZBycVXgyXEh5FcCkIk48iUPg&s"
        bgImageSrc="https://upload.wikimedia.org/wikipedia/commons/1/1c/Kashan_-_Timche-ye_Amin_od-Dowleh_-_20140512_-_JB.jpg"
        title="Your Modern Crossroads of Global Trade"
        date="From global factories directly to your doorstep"
      >
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Subheadline */}
          <p className="text-2xl md:text-3xl font-semibold text-orange-400">
            Discover more. Pay less.
          </p>

          {/* Body copy */}
          <p className="text-lg md:text-xl leading-relaxed text-white/90">
            The spirit of the bazaar lives on—reimagined for a connected
            world. BazaarX is where makers, manufacturers, and buyers meet
            without unnecessary middlemen.
          </p>

          <p className="text-lg md:text-xl leading-relaxed text-white/90">
            By bringing products straight from the source to your home,
            BazaarX turns centuries of open exchange into a seamless digital
            marketplace.
          </p>

          {/* Accent divider */}
          <div className="h-1 w-24 bg-orange-500 rounded-full" />
        </div>
      </ScrollExpandMedia>
    </div>
  );
};

export default BazaarXCrossroadsHero;
