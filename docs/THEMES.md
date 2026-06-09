# SG Weather Ops Dashboard Themes

SG Weather Ops Dashboard ships with three dashboard themes. The theme selector in `frontend/src/components/ThemeSelector.tsx` exposes the same three values defined by `Theme` in `frontend/src/state/themeStore.tsx`.

## Implemented Themes

| Theme | Value | Body class | Purpose |
| --- | --- | --- | --- |
| Apple | `apple` | `theme-apple` | Clean glass-style default with large weather data and soft contrast. |
| Night City | `night-city` | `theme-night-city` | Dark theme with bright city-like accents. |
| Terminal | `terminal` | `theme-terminal` | High-contrast terminal style for dense reading. |

## Source Files

- `frontend/src/state/themeStore.tsx` defines the valid theme values and stores the selected theme in `localStorage` under `sg_weather_ops_dashboard_theme`.
- `frontend/src/components/ThemeSelector.tsx` renders the selector.
- `frontend/src/index.css` defines the body classes and theme-specific style overrides.

## Change Rule

When adding or removing a theme, update the TypeScript union, selector options, CSS body class, and this document together.
