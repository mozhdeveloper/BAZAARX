'use client'
import React, { CSSProperties, ReactNode, useEffect, useMemo, useRef } from "react";

/* =========================
   Types
========================= */

type Source = { mp4?: string; webm?: string; ogg?: string };
type VideoLike = string | Source;

type Eases = {
  container?: string;
  overlay?: string;
  text?: string;
};

export type HeroScrollVideoProps = {
  // Top headline area
  title?: ReactNode;
  subtitle?: ReactNode;

  // Media
  media?: VideoLike;         // string URL or {mp4, webm, ogg}
  poster?: string;
  mediaType?: "video" | "image";
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  autoPlay?: boolean;

  // Overlay content (shown over sticky media on scroll)
  overlay?: {
    caption?: ReactNode;
    heading?: ReactNode;
    paragraphs?: ReactNode[];
    extra?: ReactNode;       // slot for buttons, links, etc.
  };

  // Layout and animation tuning
  initialBoxSize?: number;   // px, starting square size (default 360)
  targetSize?: { widthVw: number; heightVh: number; borderRadius?: number } | "fullscreen";
  scrollHeightVh?: number;   // total scroll height for sticky section (default 280)
  showHeroExitAnimation?: boolean; // headline roll-away (default true)
  sticky?: boolean;          // keep media sticky (default true)
  overlayBlur?: number;      // px blur for overlay content at start (default 10)
  overlayRevealDelay?: number; // seconds offset inside main timeline (default 0.35)
  eases?: Eases;

  // Smooth scrolling
  smoothScroll?: boolean;    // initialize Lenis (default true)
  lenisOptions?: Record<string, unknown>;

  bgTransition?: { from: string; to: string };


  className?: string;
  style?: CSSProperties;
};


const DEFAULTS = {
  initialBoxSize: 360,
  targetSize: "fullscreen" as const,
  scrollHeightVh: 280,
  overlayBlur: 10,
  overlayRevealDelay: 0.35,
  eases: {
    container: "expo.out",
    overlay: "expo.out",
    text: "power3.inOut",
  } as Eases,
};

/* =========================
   Helpers
========================= */

function isSourceObject(m?: VideoLike): m is Source {
  return !!m && typeof m !== "string";
}

/* =========================
   Component
========================= */

export const HeroScrollVideo: React.FC<HeroScrollVideoProps> = ({
  title = "Future Forms",
  subtitle = "Design in Motion",
  media,
  poster,
  mediaType = "video",
  muted = true,
  loop = true,
  playsInline = true,
  autoPlay = false,

  overlay = {
    caption: "PROJECT • 07",
    heading: "Clarity in Motion",
    paragraphs: [
      "Scroll to expand the frame and reveal the story.",
      "Built with GSAP ScrollTrigger and optional Lenis smooth scroll.",
    ],
    extra: null,
  },

  initialBoxSize = DEFAULTS.initialBoxSize,
  targetSize = DEFAULTS.targetSize,
  scrollHeightVh = DEFAULTS.scrollHeightVh,
  showHeroExitAnimation = true,
  sticky = true,
  overlayBlur = DEFAULTS.overlayBlur,
  overlayRevealDelay = DEFAULTS.overlayRevealDelay,
  eases = DEFAULTS.eases,

  smoothScroll = true,
  lenisOptions,
  bgTransition,

  className,
  style,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const headlineRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const overlayCaptionRef = useRef<HTMLDivElement | null>(null);
  const overlayContentRef = useRef<HTMLDivElement | null>(null);

  const isClient = typeof window !== "undefined";

  // Inline CSS variables for tuning (non-theme)
  const cssVars: CSSProperties = useMemo(
    () => ({
      ["--initial-size" as any]: `${initialBoxSize}px`,
      ["--overlay-blur" as any]: `${overlayBlur}px`,
    }),
    [initialBoxSize, overlayBlur]
  );

  // Scroll + GSAP wiring
  useEffect(() => {
    if (!isClient) return;

    let gsap: any;
    let ScrollTrigger: any;
    let CustomEase: any;
    let LenisCtor: any;
    let lenis: any;

    let heroTl: any;
    let mainTl: any;
    let overlayDarkenEl: HTMLDivElement | null = null;

    let rafCb: ((t: number) => void) | null = null;

    let cancelled = false;

    (async () => {
      const gsapPkg = await import("gsap");
      gsap = gsapPkg.gsap || gsapPkg.default || gsapPkg;

      const ScrollTriggerPkg =
        (await import("gsap/ScrollTrigger").catch(() =>
          import("gsap/dist/ScrollTrigger")
        )) || {};
      ScrollTrigger =
        ScrollTriggerPkg.default ||
        (ScrollTriggerPkg as any).ScrollTrigger ||
        ScrollTriggerPkg;

      const CustomEasePkg =
        (await import("gsap/CustomEase").catch(() =>
          import("gsap/dist/CustomEase")
        )) || {};
      CustomEase =
        CustomEasePkg.default ||
        (CustomEasePkg as any).CustomEase ||
        CustomEasePkg;

      gsap.registerPlugin(ScrollTrigger, CustomEase);

      if (cancelled) return;

      if (smoothScroll) {
        const try1 = await import("@studio-freight/lenis").catch(() => null);
        const try2 = try1 || (await import("lenis").catch(() => null));
        LenisCtor = try2?.default || (try2 as any)?.Lenis;
        if (LenisCtor) {
          lenis = new LenisCtor({
            duration: 0.8,
            smoothWheel: true,
            gestureOrientation: "vertical",
            ...lenisOptions,
          });
          rafCb = (time: number) => lenis?.raf(time * 1000);
          gsap.ticker.add(rafCb);
          gsap.ticker.lagSmoothing(0);
          lenis?.on?.("scroll", ScrollTrigger.update);
        }
      }

      const containerEase = eases.container ?? "expo.out";
      const overlayEase = eases.overlay ?? "expo.out";
      const textEase = eases.text ?? "power3.inOut";

      const container = containerRef.current!;
      const overlayEl = overlayRef.current!;
      const overlayCaption = overlayCaptionRef.current!;
      const overlayContent = overlayContentRef.current!;
      const headline = headlineRef.current!;

      // Darkening overlay inside the media box
      if (container) {
        overlayDarkenEl = document.createElement("div");
        overlayDarkenEl.setAttribute("data-auto-darken", "true");
        overlayDarkenEl.style.position = "absolute";
        overlayDarkenEl.style.inset = "0";
        overlayDarkenEl.style.background = "rgba(0,0,0,0)";
        overlayDarkenEl.style.pointerEvents = "none";
        overlayDarkenEl.style.zIndex = "1";
        container.appendChild(overlayDarkenEl);
      }

      // Headline roll-away
      if (showHeroExitAnimation && headline) {
        heroTl = gsap.timeline({
          scrollTrigger: {
            trigger: headline,
            start: "top top",
            end: "top+=420 top",
            scrub: 1.1,
          },
        });

        headline
          .querySelectorAll<HTMLElement>(".hsv-headline > *")
          .forEach((el, i) => {
            heroTl.to(
              el,
              {
                rotationX: 80,
                y: -36,
                scale: 0.86,
                opacity: 0,
                filter: "blur(4px)",
                transformOrigin: "center top",
                ease: textEase,
              },
              i * 0.08
            );
          });
      }

      // Main sticky expansion timeline
      const triggerEl = rootRef.current?.querySelector(
        "[data-sticky-scroll]"
      ) as HTMLElement;

      if (!triggerEl || !container || !overlayEl) return;

      mainTl = gsap.timeline({
        scrollTrigger: {
          trigger: triggerEl,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.1,
        },
      });

      // Target size
      const target = (() => {
        if (targetSize === "fullscreen") {
          return { width: "92vw", height: "92vh", borderRadius: 0 };
        }
        return {
          width: `${(targetSize as any).widthVw ?? 92}vw`,
          height: `${(targetSize as any).heightVh ?? 92}vh`,
          borderRadius: (targetSize as any).borderRadius ?? 0,
        };
      })();

      // Initial states
      gsap.set(container, {
        width: initialBoxSize,
        height: initialBoxSize,
        borderRadius: 20,
        filter: "none",
        clipPath: "inset(0 0 0 0)",
      });
      gsap.set(overlayEl, { clipPath: "inset(100% 0 0 0)" });
      gsap.set(overlayContent, {
        filter: `blur(var(--overlay-blur))`,
        scale: 1.05,
      });
      gsap.set([overlayContent, overlayCaption], { y: 30 });

      // Animate the container to expand
      mainTl
        .to(
          container,
          {
            width: target.width,
            height: target.height,
            borderRadius: target.borderRadius,
            ease: containerEase,
          },
          0
        )
        // Darken as it expands
        .to(
          overlayDarkenEl,
          {
            backgroundColor: "rgba(0,0,0,0.4)",
            ease: "power2.out",
          },
          0
        )
        // Reveal overlay panel
        .to(
          overlayEl,
          {
            clipPath: "inset(0% 0 0 0)",
            backdropFilter: `blur(${overlayBlur}px)`,
            ease: overlayEase,
          },
          overlayRevealDelay
        )
        // Content slides in and unblurs
        .to(overlayCaption, { y: 0, ease: overlayEase }, overlayRevealDelay + 0.05)
        .to(
          overlayContent,
          {
            y: 0,
            filter: "blur(0px)",
            scale: 1,
            ease: overlayEase,
          },
          overlayRevealDelay + 0.05
        );

      // Background color transition
      if (bgTransition && rootRef.current) {
        gsap.set(rootRef.current, { backgroundColor: bgTransition.from });
        mainTl.to(
          rootRef.current,
          {
            backgroundColor: bgTransition.to,
            ease: "power1.inOut",
          },
          0
        );
      }

      // Try to play video
      const videoEl = container.querySelector("video") as HTMLVideoElement | null;
      if (videoEl) {
        const tryPlay = () => videoEl.play().catch(() => { });
        tryPlay();
        ScrollTrigger.create({
          trigger: triggerEl,
          start: "top top",
          onEnter: tryPlay,
        });
      }
    })();

    return () => {
      cancelled = true;
      try {
        (heroTl as any)?.kill?.();
        (mainTl as any)?.kill?.();
      } catch { }
      try {
        if ((ScrollTrigger as any)?.getAll && rootRef.current) {
          (ScrollTrigger as any)
            .getAll()
            .forEach((t: any) => rootRef.current!.contains(t.trigger) && t.kill(true));
        }
      } catch { }
      try {
        if (overlayDarkenEl?.parentElement) {
          overlayDarkenEl.parentElement.removeChild(overlayDarkenEl);
        }
      } catch { }
      try {
        if (rafCb && (gsap as any)?.ticker) {
          (gsap as any).ticker.remove(rafCb);
          (gsap as any).ticker.lagSmoothing(1000, 16);
        }
      } catch { }
      try {
        (lenis as any)?.off?.("scroll", (ScrollTrigger as any)?.update);
        (lenis as any)?.destroy?.();
      } catch { }
    };
  }, [
    isClient,
    initialBoxSize,
    targetSize,
    scrollHeightVh,
    overlayBlur,
    overlayRevealDelay,
    eases.container,
    eases.overlay,
    eases.text,
    showHeroExitAnimation,
    sticky,
    smoothScroll,
    bgTransition,
    JSON.stringify(lenisOptions),
  ]);

  // Media rendering
  const renderMedia = () => {
    if (mediaType === "image") {
      const src = typeof media === "string" ? media : media?.mp4 || "";
      return (
        <img
          src={src}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center" }}
        />
      );
    }
    // video
    const sources: React.ReactElement[] = []; if (typeof media === "string") {
      sources.push(<source key="mp4" src={media} type="video/mp4" />);
    } else if (isSourceObject(media)) {
      if (media.webm) sources.push(<source key="webm" src={media.webm} type="video/webm" />);
      if (media.mp4) sources.push(<source key="mp4" src={media.mp4} type="video/mp4" />);
      if (media.ogg) sources.push(<source key="ogg" src={media.ogg} type="video/ogg" />);
    }

    return (
      <video
        poster={poster}
        muted={muted}
        loop={loop}
        playsInline={playsInline}
        autoPlay={autoPlay || muted}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center" }}
      >
        {sources}
      </video>
    );
  };

  return (
    <div
      ref={rootRef}
      className={["hsv-root", className].filter(Boolean).join(" ")}
      style={{ ...cssVars, ...style }}
    >
      {/* Headline/hero area */}
      <div className="hsv-container" ref={headlineRef}>
        <div className="hsv-headline">
          <h1 className="hsv-title">{title}</h1>
          {subtitle ? <h2 className="hsv-subtitle">{subtitle}</h2> : null}
        </div>
      </div>

      {/* Sticky scroll section */}
      <div
        className="hsv-scroll"
        data-sticky-scroll
        style={{ height: `${Math.max(150, scrollHeightVh)}vh` }}
      >
        <div className={`hsv-sticky ${sticky ? "is-sticky" : ""}`}>
          <div className="hsv-media" ref={containerRef}>
            {renderMedia()}

            {/* overlay that reveals */}
            <div className="hsv-overlay" ref={overlayRef}>
              {overlay?.caption ? (
                <div className="hsv-caption" ref={overlayCaptionRef}>
                  {overlay.caption}
                </div>
              ) : null}
              <div className="hsv-overlay-content" ref={overlayContentRef}>
                {overlay?.heading ? <h3>{overlay.heading}</h3> : null}
                {overlay?.paragraphs?.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                {overlay?.extra}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Styles (scoped) */}
      <style>{`
        /* System theme: define light defaults, override in dark */
        .hsv-root {
          --bg: var(--bg);
          --text: #ff512ae8;
          --muted: #6b7280;
          --muted-bg: rgba(15,17,21,0.06);
          --muted-border: rgba(15,17,21,0.12);
          --overlay-bg: rgba(10,10,14,0.42);
          --overlay-text: #ffffff;
          --accent: #7c3aed;    /* violet */
          --accent-2: #22d3ee;  /* cyan */
          --shadow: 0 10px 30px rgba(0,0,0,0.08);

          color-scheme: light dark;
          background: var(--bg);
          color: var(--text);
          font-family: Inter, Inter var, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
          overflow-x: clip;
        }
        @media (prefers-color-scheme: dark) {
          .hsv-root {
            --text: #e5e7eb;
            --muted: #9ca3af;
            --muted-bg: rgba(229,231,235,0.08);
            --muted-border: rgba(229,231,235,0.14);
            --overlay-bg: rgba(139, 78, 28, 0.48);
            --overlay-text: #ffffff;
            --accent: #8b5cf6;
            --accent-2: #22d3ee;
            --shadow: 0 12px 36px rgba(0,0,0,0.35);
          }
        }

        .hsv-container {
          height: 100vh;
          display: grid;
          place-items: center;
          padding: clamp(10px, 3vw, 40px);
          perspective: 900px;
        }

        .hsv-headline { 
          text-align: center;
          transform-style: preserve-3d;
          max-width: min(100%, 1100px);
        }
        .hsv-headline > * {
          transform-style: preserve-3d;
          backface-visibility: hidden;
          transform-origin: center top;
        }

        .hsv-title {
          margin: 0 0 .6rem 0;
          font-size: clamp(170px, 8vw, 96px);
          line-height: 0.98;
          font-weight: 900;
          letter-spacing: -0.02em;
          text-wrap: balance;
          background: linear-gradient(180deg, var(--text) 0%, var(--text) 10%, var(--accent) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.05));
        }
          
        .hsv-subtitle {
          margin: 0 0 1.25rem 0;
          font-size: clamp(50px, 3.5vw, 28px);
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #FF6A00;
        }
        
        .hsv-scroll { position: relative; }
        .hsv-sticky.is-sticky {
          position: sticky;
          top: 0;
          height: 100vh;
          display: grid;
          place-items: center;
        }

        .hsv-media {
          position: relative;
          width: var(--initial-size);
          height: var(--initial-size);
          border-radius: 20px;
          overflow: hidden;
          display: grid;
          place-items: center;
          transform-origin: center center;
          transition: border-radius 0.3s ease;
          box-shadow: var(--shadow);
        }

        .hsv-overlay {
          position: absolute;
          inset: 0;
          background: var(--overlay-bg);
          color: var(--overlay-text);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: clamp(16px, 4vw, 40px);
          clip-path: inset(100% 0 0 0);
          backdrop-filter: blur(var(--overlay-blur));
          z-index: 2;
        }

        .hsv-caption {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;
          font-size: 1.2rem;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          position: absolute;
          top: clamp(8px, 3vw, 24px);
          left: 0;
          width: 100%;
          text-align: center;
          opacity: 0.95;
        }

        .hsv-overlay-content {
          margin-top: 1.2rem;
          max-width: 68ch;
          display: grid;
          gap: 0.9rem;
          text-align: center;
        }
        .hsv-overlay-content h3 {
          font-size: clamp(40px, 7vw, 70px);
          line-height: 1.02;
          margin: 0;
          font-weight: 900;
          letter-spacing: -0.01em;
          background: linear-gradient(90deg, #fff 0%, #fff 40%, var(--accent-2) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-wrap: balance;
          position: relative;
        }
        .hsv-overlay-content h3::after {
          content: "";
          display: block;
          width: 140px;
          height: 3px;
          border-radius: 999px;
          margin: 10px auto 0 auto;
          background: linear-gradient(90deg, var(--accent), var(--accent-2));
          opacity: 0.9;
        }
        .hsv-overlay-content p {
          font-size: clamp(15px, 2.1vw, 19px);
          line-height: 1.75;
          margin: 0;
          color: #f3f4f6; /* better contrast over video */
          opacity: 0.95;
        }

        @media (max-width: 900px) {
          .hsv-overlay-content { max-width: 40ch; }
        }
      `}</style>
    </div>
  );
};

export default HeroScrollVideo