# BazaarX: Branding & Landing Page Overview

This document outlines the brand identity and the comprehensive structure of the BazaarX landing page.

## 1. Brand Identity

**Core Concept**
BazaarX reimagines the traditional bazaar for the digital age, creating a direct "Modern Crossroads of Global Trade" that connects makers and manufacturers directly to buyers, eliminating unnecessary middlemen.

**Visual Style**
*   **Primary Color**: **Orange** (`#FF6A00` / Tailwind `orange-500`). Used for key accents, dividers, and call-to-action elements to evoke warmth and vibrancy.
*   **Secondary Colors**:
    *   **Dark Gray/Black** (`gray-900`): For primary headings and clear legibility.
    *   **Medium Gray** (`gray-700`): For body text and supporting descriptions.
    *   **White** (`bg-white`): Dominant background for a clean, premium feel.

**Typography**
*   **Accent & Heading Font**: **Fondamento** (Google Font).
    *   *Usage*: Key thematic titles, historical sections, and major brand statements.
    *   *Weights*: Bold (700) and Regular (400).
    *   *Examples*: "Bazaar", "Centers of Exchange", "Trade, Craft, Gathering", "Your Modern Crossroads of Global Trade".
*   **Body & UI Font**: Standard Sans-Serif (Inter/System default) for readability/utility.

---

## 2. Landing Page Structure (`HomePage.tsx`)

The landing page is designed as a narrative journey, starting with the historical roots of the bazaar and transitioning into the modern BazaarX platform.

### A. Narrative & History
1.  **Bazaar Hero**:
    *   Initial visual entry point.
2.  **Origin Story** (`BazaarHistory`):
    *   Scroll-driven video background.
    *   Overlay text explaining the etymology of "Bazaar" (Origin).
    *   **Typography**: "Bazaar" in *Fondamento Bold*.
3.  **Centers of Exchange** (`BazaarHistoryZoomParallax`):
    *   Parallax zoom effect with historical bazaar images.
    *   **Key Element**: Title "Centers of Exchange" in solid Orange (`text-orange-500`), *Fondamento Bold*, localized on one line.
4.  **Core Pillars** (`BazaarRevealWords`):
    *   "Scrollytelling" section revealing three key words: **Trade**, **Craft**, **Gathering**.
    *   **Interaction**: As user scrolls, images for each word are revealed.
    *   **Design**: Large *Fondamento* text (`text-9xl`), large supporting images, justified historical context paragraph with thick orange borders.

### B. The Modern Transition
5.  **Expansion Hero** (`ScrollExpansionHero`):
    *   **Main Title**: "Your Modern Crossroads of Global Trade" (*Fondamento Bold*, `text-8xl`).
    *   **Sub-Section**:
        *   Tagline: "Discover more. Pay less." (Orange, Italic, *Fondamento*).
        *   Subheadline: "From global factories directly to your doorstep" (Two-tone, *Fondamento Bold*).
    *   **Content**: Explains the transition from ancient bazaars to the digital BazaarX marketplace.

### C. Platform Features & Tools
6.  **Categories Explorer** (`ScrollMorphHero`):
    *   Interactive section to explore different product categories.
7.  **Mobile Experiene** (`MobileAppShowcase`):
    *   Highlight: "Experience **Bazaar** On Your Phone" (with "Bazaar" in *Fondamento*).
    *   Links to App Store & Play Store.
8.  **Trust & Quality** (`BazaarTrustShowcase`):
    *   Showcases security and verification features.
9.  **POS Lite** (`POSLiteFeature`):
    *   Features for offline/physical selling integration.
10. **Seller Dashboard** (`Hero195`):
    *   Interactive preview/demo of the seller management interface.

### D. Social Proof & Community
11. **Testimonials**:
    *   **Filipino Sellers**: (`BazaarXTestimonials`) Success stories from local entrepreneurs.
    *   **Brand Owners**: (`BrandTestimonials`) Feedback from major brands.
12. **Support Local** (`FeatureStrip`):
    *   Specific section encouraging support for Filipino businesses (`FeatureStrip`).

### E. Commerce & Collections
13. **Trending Products**: Algorithm-based product rail.
14. **Best Sellers**: Top-performing products rail.
15. **Featured Stores**: Highlighted verified sellers rail.
16. **Secure Shopping** (`FeatureStrip`):
    *   Buyer protection and payment security details.
17. **New Arrivals**: Latest product additions rail.

### F. Navigation
18. **Categories Footer**: Quick links to all categories.
19. **Global Footer** (`BazaarFooter`): Site map, legal links, and contacts.
