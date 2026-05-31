# Weather Starter Themes

Weather Starter ships with five dashboard themes. The theme selector in `frontend/src/components/ThemeSelector.tsx` exposes the same five values defined by `Theme` in `frontend/src/state/themeStore.tsx`.

## Implemented Themes

| Theme | Value | Body class | Purpose |
| --- | --- | --- | --- |
| Apple | `apple` | `theme-apple` | Clean glass-style default with large weather data and soft contrast. |
| Cotton Candy | `cotton-candy` | `theme-cotton-candy` | Light pastel theme with a softer, playful feel. |
| Night City | `night-city` | `theme-night-city` | Dark theme with bright city-like accents. |
| Pixel | `pixel` | `theme-pixel` | Retro theme with sharper colors and block-like styling. |
| Terminal | `terminal` | `theme-terminal` | High-contrast terminal style for dense reading. |

## Source Files

- `frontend/src/state/themeStore.tsx` defines the valid theme values and stores the selected theme in `localStorage` under `weather_starter_theme`.
- `frontend/src/components/ThemeSelector.tsx` renders the selector.
- `frontend/src/index.css` defines the body classes and theme-specific style overrides.

## Change Rule

When adding or removing a theme, update the TypeScript union, selector options, CSS body class, and this document together.
