# Weather Starter Themes

This document outlines the visual themes designed for the Weather Starter application. Each theme provides a distinct aesthetic experience, dictating color palettes, typography, card styling, and layout density.

## 1. Frosted Glass (Apple-esque)

- **Description:** A sleek, modern aesthetic featuring deeply blurred, translucent elements that adapt seamlessly to stunning, full-screen weather background images.
- **Color:** Dynamic, weather-driven background gradients with crisp white text and subtle UI elements.
- **Typography:** _Inter_ or _SF Pro_ — clean, neutral, and perfectly legible sans-serifs.
- **Card Styling:** Heavy background blur (`backdrop-filter: blur`), semi-transparent white/black fill (glassmorphism), and a delicate 1px translucent border.
- **Layout Density:** Spacious and airy; generous padding with large, bold typography for primary metrics like temperature.

## 2. Soft Plastic (Neumorphism)

- **Description:** A highly tactile, soft UI where elements appear extruded from or smoothly pressed into the background using sophisticated, subtle shadowing.
- **Color:** Monochromatic off-white or light gray (e.g., `#e0e5ec`), with low-contrast, muted color accents for active states.
- **Typography:** _Nunito_ or _Avenir_ — soft, rounded, and visually unobtrusive.
- **Card Styling:** Exact background color matching the canvas, utilizing paired inset/outset shadows to create 3D forms without hard borders.
- **Layout Density:** Medium; requires significant negative space to allow the soft shadows to render properly without clashing.

## 3. Night City (Cyberpunk Neon)

- **Description:** A futuristic, high-energy dark mode with glowing neon accents, sharp edges, and gritty, tech-focused undertones.
- **Color:** Deep obsidian or charcoal backgrounds layered with vibrant neon pink, cyan, and electric yellow accents.
- **Typography:** _Orbitron_ or _Rajdhani_ — geometric, technical, and slightly aggressive.
- **Card Styling:** Completely opaque dark backgrounds, sharp 90-degree corners, and glowing inset/outset neon borders (`box-shadow` glows).
- **Layout Density:** High density, dashboard-like, mimicking a complex futuristic control terminal.

## 4. Pixel Weather (Retro 8-bit)

- **Description:** A nostalgic, playful theme reminiscent of classic 16-bit video games, utilizing blocky graphics, pixelated fonts, and sharp contrast.
- **Color:** Bright, limited color palette reminiscent of classic arcade or Gameboy palettes (pure blues, bright greens, stark whites).
- **Typography:** _Press Start 2P_ or _VT323_ — classic pixel/bitmap style fonts.
- **Card Styling:** Chunky, solid black 2px borders, sharp corners, solid background fills, and distinct, hard drop-shadows without blur.
- **Layout Density:** Medium; blocky elements naturally consume more space, requiring a structured, grid-like layout.

## 5. Form & Function (Bauhaus Geometric)

- **Description:** An abstract, art-focused design relying on primary colors, thick lines, and bold geometric shapes for a striking, magazine-like data visualization.
- **Color:** Stark white background, pure red, blue, and yellow accents, grounded by heavy black lines.
- **Typography:** _Futura_ or _Helvetica Neue_ — stark, modernist, and perfectly geometric.
- **Card Styling:** Sharp rectangles, perfect circles for weather icons, thick black borders, and solid primary color fills.
- **Layout Density:** Asymmetrical and airy; deliberately breaks standard grid constraints for a more editorial feel.

## 6. The Almanac (Dark Academia / Vintage)

- **Description:** A sophisticated, old-world aesthetic resembling a vintage scientific journal or meteorological almanac.
- **Color:** Sepia, parchment off-white, dark leather brown, muted gold, and faded ink blue.
- **Typography:** _Playfair Display_ or _Merriweather_ — elegant, highly readable, traditional serifs.
- **Card Styling:** Subtle paper textures, fine single or double-line engraved borders, and ornate dividers instead of distinct modern "cards".
- **Layout Density:** High density, text-heavy, structured like a printed newspaper column or scientific ledger.

## 7. CLI Weather (High-Contrast Terminal)

- **Description:** A developer-focused, brutalist theme that accurately mimics the raw, functional aesthetic of a command-line interface.
- **Color:** Pure black (`#000000`) background with bright terminal green (`#00FF00`) or amber text.
- **Typography:** _Fira Code_ or _JetBrains Mono_ — strictly monospace.
- **Card Styling:** No physical cards; sections are defined purely by ASCII art borders, brackets `[ ]`, or dashed lines `---`.
- **Layout Density:** Very high density, purely functional, with zero decorative padding or graphical icons (using ASCII symbols instead).

## 8. Cotton Candy (Pastel Dream)

- **Description:** A soft, cheerful, and highly approachable theme using muted pastel tones and heavily rounded, friendly shapes.
- **Color:** Mint green, baby blue, peach, lavender, and soft buttercream yellow.
- **Typography:** _Quicksand_ or _Poppins_ — very round, soft, and friendly sans-serifs.
- **Card Styling:** Pill-shaped buttons, extremely rounded cards (squarcles), and soft, colorful, diffused drop-shadows.
- **Layout Density:** Low density, bouncy, and airy; prioritizes cute, custom illustrations over overwhelming raw data.

## 9. Northern Lights (Ethereal Aurora)

- **Description:** A dark, moody theme featuring fluid, animated, colorful mesh gradients that slowly shift and blend seamlessly across the screen.
- **Color:** Deep space purple and midnight blue, interwoven with shifting emerald, magenta, and cyan gradients.
- **Typography:** _Outfit_ or _Montserrat_ — sleek, modern, wide sans-serifs.
- **Card Styling:** Borderless, utilizing very subtle glassmorphism or low-opacity dark fills to let the background gradients serve as the primary visual.
- **Layout Density:** Spacious and minimalist, keeping UI elements out of the way to highlight the dynamic background.

## 10. Adaptive Clay (Material You)

- **Description:** Inspired by Android's modern design language, featuring large, playful shapes and a dynamic palette extracted directly from the current weather condition.
- **Color:** Dynamic pastel and earthy tones generated based on the weather icon, ensuring high-contrast text.
- **Typography:** _Roboto Flex_ or _Google Sans_ — highly legible with varied weights for strong hierarchy.
- **Card Styling:** Asymmetrical rounded corners (e.g., one sharp corner, three heavily rounded), flat solid colors, no borders, and no shadows.
- **Layout Density:** Medium-to-low density; utilizes chunky touch targets and large, easily scannable blocks of color.

## 11. E-Reader (Monochrome E-ink)

- **Description:** A high-contrast, black-and-white theme designed to mimic the crisp, battery-saving, distraction-free display of an e-ink device.
- **Color:** Stark white, pure black, and exactly three distinct shades of gray for hierarchy.
- **Typography:** _Literata_ or _Source Serif Pro_ — optimized for crisp reading at small sizes.
- **Card Styling:** Dithered gradient backgrounds, sharp 1px black borders, and stippled/halftone shadow effects.
- **Layout Density:** Medium, highly structured, strict grid-based alignment.

## 12. Liquid Metal (Y2K Holographic)

- **Description:** A nostalgic nod to late 90s/early 2000s futurism, featuring iridescent color shifts and metallic, reflective textures.
- **Color:** Silver, chrome, and iridescent pastel gradients that shift between pink, cyan, and purple.
- **Typography:** _Syncopate_ or _Eurostile_ — wide, tech-focused, extended fonts.
- **Card Styling:** Metallic gradient borders, pill shapes, inner bevels, and heavy emboss effects.
- **Layout Density:** Dense; features floating elements, overlapping translucent panels, and a slightly chaotic spatial arrangement.

## 13. Orbital Command (Sci-Fi HUD)

- **Description:** An intense, data-rich dashboard resembling a heads-up display from a sci-fi spaceship or advanced military aircraft.
- **Color:** Deep teal or navy background, glowing cyan data points, with warning red and caution orange accents for severe weather.
- **Typography:** _Share Tech Mono_ or _OCR A Extended_.
- **Card Styling:** Thin, technical geometric lines, bracketed corners, grid overlays, and scanning-line CRT effects.
- **Layout Density:** Extremely high density, packed with complex micro-data, radial graphs, and tiny technical labels.

## 14. Fluffy Clouds (Organic Claymorphism)

- **Description:** A friendly, ultra-accessible 3D design trend using soft, pillowy shapes that look like inflated matte balloons or molded clay.
- **Color:** Warm, inviting, and highly saturated colors—matte terracotta, sky blue, buttery yellow.
- **Typography:** _Fredoka_ or _Balsamiq Sans_ — casual, bubbly, handwriting-adjacent.
- **Card Styling:** Thick, fluffy inner drop shadows (inset), distinct soft outer drop shadows, and extremely rounded, almost circular corners.
- **Layout Density:** Low density, featuring large chunky cards that are highly spaced out for a playful feel.

## 15. Raw HTML (Brutalist Web)

- **Description:** An intentional, unapologetically raw design that exposes the default structure of the web without artificial polishing or CSS resets.
- **Color:** Default web-safe blue (`#0000EE`) for links, default gray (`#C0C0C0`) for backgrounds/buttons, black text, pure white canvas.
- **Typography:** _Times New Roman_ or the default system serif.
- **Card Styling:** Standard HTML `<fieldset>` and `<legend>` tags, hard 1px solid black borders, and default native browser button styling.
- **Layout Density:** Fluid, unconstrained, and linear; reads top-to-bottom like an early 90s academic webpage.
