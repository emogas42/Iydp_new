=0---
design_system:
  name: "IYDP Web Interface"
  version: "1.0.0"
  style: "Editorial nonprofit with energetic youth-focused accents"
  color:
    brand:
      primary:
        "50": "#f0fbff"
        "100": "#e0f7ff"
        "200": "#bbeaff"
        "300": "#7dd3ff"
        "400": "#00aef6"
        "500": "#0096d6"
        "600": "#0077b6"
        "700": "#005a94"
      secondary:
        "50": "#faf5ff"
        "100": "#f3e8ff"
        "200": "#e9d5ff"
        "300": "#d8b4fe"
        "400": "#b06ad6"
        "500": "#9333ea"
        "600": "#7e22ce"
        "700": "#6f3d90"
      accent:
        green: "#7dba4e"
        red: "#f06e60"
        amber: "#f59e0b"
        cyan: "#06b6d4"
    neutral:
      white: "#ffffff"
      slate_50: "#f8fafc"
      slate_100: "#f1f5f9"
      slate_200: "#e2e8f0"
      slate_400: "#94a3b8"
      slate_500: "#64748b"
      slate_600: "#475569"
      slate_700: "#334155"
      slate_800: "#1e293b"
      slate_900: "#0f172a"
      neutral_50: "#fafafa"
      neutral_100: "#f5f5f5"
      neutral_200: "#e5e5e5"
      neutral_400: "#a3a3a3"
      neutral_500: "#737373"
      neutral_700: "#404040"
      neutral_900: "#171717"
    state:
      success: "#7dba4e"
      warning: "#f59e0b"
      error: "#f06e60"
      info: "#00aef6"
    social:
      linkedin: "#0077b5"
      facebook: "#1877f2"
      x: "#000000"
  typography:
    families:
      sans: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      display: "'Space Grotesk', 'Plus Jakarta Sans', sans-serif"
      serif: "Georgia, serif"
    weights:
      medium: 500
      semibold: 600
      bold: 700
      extrabold: 800
      black: 900
    scale:
      xs:
        size: "12px"
        line_height: "16px"
        letter_spacing: "0.01em"
      sm:
        size: "14px"
        line_height: "20px"
        letter_spacing: "0"
      base:
        size: "16px"
        line_height: "24px"
        letter_spacing: "0"
      lg:
        size: "18px"
        line_height: "28px"
        letter_spacing: "-0.01em"
      xl:
        size: "20px"
        line_height: "30px"
        letter_spacing: "-0.01em"
      "2xl":
        size: "24px"
        line_height: "32px"
        letter_spacing: "-0.02em"
      "3xl":
        size: "30px"
        line_height: "36px"
        letter_spacing: "-0.02em"
      "4xl":
        size: "36px"
        line_height: "44px"
        letter_spacing: "-0.02em"
      "5xl":
        size: "48px"
        line_height: "52px"
        letter_spacing: "-0.02em"
      "6xl":
        size: "60px"
        line_height: "68px"
        letter_spacing: "-0.03em"
      "7xl":
        size: "72px"
        line_height: "80px"
        letter_spacing: "-0.03em"
  spacing:
    unit: "4px"
    scale:
      "0": "0px"
      "1": "4px"
      "2": "8px"
      "3": "12px"
      "4": "16px"
      "5": "20px"
      "6": "24px"
      "8": "32px"
      "10": "40px"
      "12": "48px"
      "16": "64px"
      "20": "80px"
      "24": "96px"
      "32": "128px"
  radii:
    none: "0px"
    xs: "4px"
    sm: "8px"
    base: "12px"
    md: "16px"
    lg: "20px"
    xl: "24px"
    "2xl": "32px"
    "3xl": "40px"
    full: "9999px"
  elevation:
    shadows:
      xs: "0 1px 2px rgba(0, 0, 0, 0.05)"
      sm: "0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)"
      base: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)"
      md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
      lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
      xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.15)"
    glass:
      background: "rgba(255, 255, 255, 0.8)"
      border: "rgba(255, 255, 255, 0.2)"
      blur: "16px"
  motion:
    durations:
      fast: "200ms"
      normal: "300ms"
      slow: "400ms"
      extra_slow: "700ms"
    easing:
      standard: "cubic-bezier(0.4, 0, 0.2, 1)"
      ease: "ease"
      ease_in_out: "ease-in-out"
      ease_out: "ease-out"
    transitions:
      hover_lift: "translateY(-2px)"
      card_lift: "translateY(-4px)"
      micro_lift: "translateY(-0.5px)"
    keyframes:
      fade_in:
        "0%":
          opacity: 0
        "100%":
          opacity: 1
      slide_up:
        "0%":
          opacity: 0
          transform: "translateY(16px)"
        "100%":
          opacity: 1
          transform: "translateY(0)"
      slide_down:
        "0%":
          opacity: 0
          transform: "translateY(-16px)"
        "100%":
          opacity: 1
          transform: "translateY(0)"
      pulse_soft:
        "0%":
          opacity: 1
        "50%":
          opacity: 0.5
        "100%":
          opacity: 1
  layout:
    container:
      wide_max_width: "1280px"
      narrow_max_width: "896px"
      horizontal_padding_mobile: "16px"
      horizontal_padding_tablet: "24px"
      horizontal_padding_desktop: "32px"
    section_spacing:
      tight: "32px to 48px"
      regular: "64px to 96px"
      spacious: "96px to 128px"
---

# Visual Identity

This UI is a bright, youth-oriented information platform with a polished nonprofit/editorial tone. It blends strong contrast, large typographic hierarchy, and optimistic accent colors. The dominant brand signal is cyan-blue, with purple as a secondary brand voice and green/red as semantic and campaign accents.

# Color Intent

The interface uses a mostly light canvas (`white`, `slate_50`) and reserves saturated colors for action and navigation emphasis:

- Primary actions and key highlights are blue (`#00aef6` family).
- Secondary accents, category identity, and hover variation often use purple (`#6f3d90` family).
- Green (`#7dba4e`) appears as positive/youth-growth emphasis.
- Red (`#f06e60`) appears for editorial emphasis, alerts, and high-attention metadata.

Text color relies on deep slate (`#0f172a`) for headings and mid-slate tones for body copy to keep long-form pages readable.

# Typography and Hierarchy

The type system is intentionally high-contrast:

- Display and hero headings are heavy (`700` to `900`) with compact leading and slight negative tracking.
- Body copy uses the sans family with comfortable line height.
- Small labels and metadata frequently use uppercase plus increased tracking to create structured information blocks.

The overall effect is energetic but organized: expressive headlines over a restrained body system.

# Components and Surfaces

Common surface language:

- Rounded corners are prominent (`12px` to `40px`), especially on cards, forms, and section wrappers.
- Cards are white with subtle borders and elevation; hover interactions increase shadow and lift.
- Inputs and filters use soft neutral backgrounds, then gain stronger border contrast on focus.
- Badges/tags use tinted backgrounds of their category color with bold uppercase labels.

Navigation and utility surfaces frequently use backdrop blur and semi-opaque backgrounds for a modern floating feel.

# Motion and Interaction

Motion is subtle and frequent:

- Most interactions transition between `200ms` and `300ms`.
- Hover states often combine color shift + elevation + slight vertical translation.
- Entrance and reveal animations use fade and short slide transforms.

The motion language is meant to feel responsive and optimistic, without playful overshoot or exaggerated physics.

# Content Tone and Layout Rhythm

The layout favors:

- Large hero bands with immediate message clarity.
- Filter bars and card grids for discovery pages.
- Repeated use of capsule, badge, and metadata chips to make dense content scannable.
- Generous section spacing to keep multi-section pages readable on both desktop and mobile.

This system should be preserved as: light base, vivid brand accents, strong heading rhythm, rounded elevated components, and restrained micro-motion.
