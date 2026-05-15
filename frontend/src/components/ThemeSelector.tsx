import { type Theme, useTheme } from '../state/themeStore';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="absolute top-4 right-4 z-50">
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
        className="cursor-pointer appearance-none rounded-lg border border-white/20 bg-black/20 px-3 py-1.5 pr-8 text-sm font-medium text-white shadow-sm backdrop-blur-md transition hover:bg-black/30 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
      >
        <option value="apple" className="bg-slate-800">
          Apple
        </option>
        <option value="cotton-candy" className="bg-slate-800">
          Cotton Candy
        </option>
        <option value="night-city" className="bg-slate-800">
          Night City
        </option>
        <option value="pixel" className="bg-slate-800">
          Pixel
        </option>
        <option value="terminal" className="bg-slate-800">
          Terminal
        </option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
