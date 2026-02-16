import React from 'react';
import HeroScrollVideo from '@/components/ui/scroll-animated-video';

const BazaarHistory: React.FC = () => {
  return (
    <section className="bg-transparent">
      <HeroScrollVideo
        title={<span className="font-fondamento font-bold tracking-wider text-[#FB8C00]">bāzār</span>}
        subtitle={<span className="font-fondamento text-[#7C2D12]">بازار</span>}
        media={'/bazaar.mp4'}
        overlay={{
          caption: "ORIGIN",
          heading: (
            <span className="font-fondamento font-bold">bazaar</span>
          ),
          paragraphs: [
            <div key="etymology-layout" className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 sm:gap-8 items-start text-left w-full max-w-[900px] mx-auto">
              <div className="text-[length:clamp(14px,1.8vw,20px)] leading-[1.75] text-[#f3f4f6] opacity-95">
                <br></br>Derived from the Persian root words <em>bā</em> ("with" or "together") and <em>zār</em> ("place" or "ground")
              </div>
              <div className="text-[length:clamp(12px,1.8vw,22px)] font-mono whitespace-nowrap text-[#f6f5f3ff] mt-2 sm:mt-0">
                <br></br>['bāzār']
              </div>
            </div>,
            <span className="block text-justify mx-auto max-w-2xl text-white]">
              <br></br>It originated in ancient Persia as the heart of urban life—a shared place where commerce, culture, and community converged. Early bazaars were carefully woven into the structure of Iranian cities, linking major roads and forming continuous covered corridors that sheltered merchants and travelers alike.
            </span>,
          ],
          extra: null,
        }}
        initialBoxSize={300}
        scrollHeightVh={220}
        overlayBlur={2}
        overlayRevealDelay={0.3}
        smoothScroll={true}
        className="!hsv-root-bazaar"
        bgTransition={{ from: '#FFF6E5', to: '#FFF6E5' }}
        style={{
          ['--accent' as any]: '#FB8C00',
          ['--accent-2' as any]: '#EA580C',
          ['--text' as any]: '#7C2D12',
          ['--subtitle-color' as any]: '#EA580C',
        }}
      />
    </section>
  );
};

export default BazaarHistory;