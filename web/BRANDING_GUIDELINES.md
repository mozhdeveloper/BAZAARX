# BazaarX Brandinng Guidelines

## 🎨 Color Palette

### Primary Colors
    - Used for primary buttons, CTAs, and key interactive elements
    - Used for backgrounds and subtle highlights
    - Used for hover states and emphasis
     Custom CSS variable for primary buttons

### Muted Colors
    - Used for background sections and card areas
    - Used for muted text elements

### Border Colors
    - Used for borders around cards, inputs, and containers

### Background Gradients
    -Used in hero backgrounds 

## 🧩 Typography

### Font Families

#### Heading Fonts
- **Primary Font**: Montserrat , 
- **Fallback**: Poppins
- **Usage**: Headings, titles, and prominent text elements
- **Import**: @import url('https://fonts.googleapis.com/css2?family=Agbalumo&family=Alegreya+Sans:wght@400;700;800&family=Gothic+A1:wght@400;600;700;800&family=Inter:opsz,wght@14..32,700&family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap');

#### Body Fonts
- **Primary Font**: Inter 
- **Fallback**: Roboto 
- **Usage**: All body text, paragraphs, labels, buttons, and interface elements
- **Import**: @import url('https://fonts.googleapis.com/css2?family=Agbalumo&family=Alegreya+Sans:wght@400;700;800&family=Gothic+A1:wght@400;600;700;800&family=Inter:opsz,wght@14..32,700&family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap');

#### Monospace Fonts
- **Primary Font**: JetBrains Mono`, `Fira Code`
- **Usage**: Code snippets, technical displays, data fields
- **Fallback**:

### Font Weights
- **Regular**: 400 (Normal body text)
- **Medium**: 500 (Emphasis in body)
- **Semibold**: 600 (Secondary headings)
- **Bold**: 700 (Strong emphasis)
- **Extra Bold**: 800 (Primary headings)
- **Black**: 900 (Emphasized headlines)

## 🎨 Design System

### Spacing System
- **Custom CSS Variables**:
  - **XS**: 4px (`--spacing-xs`) - icons spacing
  - **SM**: 8px (`--spacing-sm`) - 
  - **MD**: 12px (`--spacing-md`)
  - **LG**: 24px (`--spacing-lg`)
  - **XL**: 48px (`--spacing-xl`)

- **Tailwind Spacing**:
  - **Gap Utilities**: `gap-12` (48px), `gap-20` (80px) for grid layouts
  - **Margin Utilities**: `mb-8` (32px) for element separation
  - **Padding Utilities**: `p-4` (16px) for containers, `px-8` (32px) for horizontal padding
  - **Responsive Spacing**: `pt-8 pb-16 lg:pt-16 lg:pb-24` for adaptive layouts

### Shadows
- **Custom CSS Variables**:
  - **Small Shadow**: (`--shadow-small`) - buttons, badges, forms
  - **Medium Shadow**: (--shadow-medium`) - product cards, nav, 
  - **Large Shadow**: (`--shadow-large`) - modals, floating, sidepanel
- **Tailwind Classes**: `shadow-xs` for containers and buttons

### Spacing System

## 📐 Grid & Layout Framework

### Container Classes

### Responsive Breakpoints

## 📱 Implementation Notes

### CSS Custom Properties
- **Primary Color**: --brand-primary: #FF6A00
- **Background**: --bg-card: #ffffff
- **Foreground**: --foreground: 222.2 84% 4.9%
- **Card Elements**: --card: 0 0% 100%
- **Border**: --border: 214.3 31.8% 91.4%
- **Input**: --input: 214.3 31.8% 91.4%
- **Ring**: --ring: 24 100% 50%
- **Accent**: - **Accent**: --accent: 210 40% 96.1%
- **Muted**: #9CA3AF;
- **Popovers**: --popover: 0 0% 100%
- **Radius**: `var(--radius)` (0.5rem)
- **Section Padding**: `var(--section-padding)` (5rem)
- **Container Max**: `var(--container-max)` (1280px)
- **Shadows**: `var(--shadow-sm)`, `var(--shadow-md)`, `var(--shadow-lg)`
- **Spacing**: `var(--spacing-xs)`, `var(--spacing-sm)`, `var(--spacing-md)`, `var(--spacing-lg)`, `var(--spacing-xl)`

### Component Consistency

### Accessibility

## 🔄 Updates & Maintenance 


