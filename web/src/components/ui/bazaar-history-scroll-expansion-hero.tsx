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
        date="Inspired by ancient bazaars. Reimagined as the modern crossroads for global trade."
      />
    </div>
  );
};

export default BazaarXCrossroadsHero;
