## 2024-05-18 - Replacing `renderToString` with template literals in React Leaflet MapCard

**Learning:** `renderToString` from `react-dom/server` is synchronous and can be significantly slow (taking ~31ms per 1000 calls vs 0.25ms for template literals), and it forces bundling of a large part of `react-dom/server` on the client-side, heavily increasing bundle sizes (~70KB uncompressed JS bundle reduction: 396.56 kB -> 325.73 kB). `renderToString` was used within `frontend/src/components/MapCard.tsx` to generate `html` string for custom leaflet `L.divIcon` objects.

**Action:** If generating simple HTML strings in client-side code where the elements do not need React's event system (like Leaflet custom markers), prefer simple string templating/concatenation instead of importing `renderToString` and rendering actual React components. Ensure simple SVG strings are manually extracted and injected rather than mounting React component SVGs.
