import React from 'react';
import HeroScrollVideo from '@/components/ui/scroll-animated-video';

const BazaarHistory: React.FC = () => {
  return (
    <section className="bg-transparent">
      <div className="container mx-auto">
        <HeroScrollVideo
          title={"BAZAAR"}
          subtitle={"history"}
          media={'/bazaar.mp4'}
          overlay={{
            caption: "ORIGIN",
            heading: (
              <span>bazaar</span>
            ),
            paragraphs: [
              <div key="etymology-layout" style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '2rem',
                alignItems: 'start',
                textAlign: 'left',
                width: '100%',
                maxWidth: '900px',
                margin: '0 auto'
              }}>
                <div style={{
                  fontSize: 'clamp(14px, 1.8vw, 20px)',
                  lineHeight: '1.75',
                  color: '#f3f4f6',
                  opacity: 0.95
                }}>
                  <br></br>Derived from the Persian root words <em>bā</em> ("with" or "together") and <em>zār</em> ("place" or "ground")
                </div>
                <div style={{
                  fontSize: 'clamp(12px, 1.8vw, 22px)',
                  fontFamily: 'ui-monospace, monospace',
                  whiteSpace: 'nowrap',
                  color: '#f6f5f3ff'
                }}>
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
          style={{
            ['--accent' as any]: '#FF6A00',
            ['--accent-2' as any]: '#FF8A4D',
          }}
        />
      </div>
    </section>
  );
};

export default BazaarHistory;