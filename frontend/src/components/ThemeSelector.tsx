import { THEMES, type Theme, useTheme } from '../state/themeStore';
import { ChevronDownIcon } from './icons';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="absolute right-3 top-3 z-50 md:right-4 md:top-4">
      <select
        aria-label="Theme"
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
        className="cursor-pointer appearance-none rounded-lg border border-white/20 bg-black/20 px-3 py-1.5 pr-8 text-sm font-medium text-white shadow-sm backdrop-blur-md transition hover:bg-black/30 focus:border-white/40"
      >
        {THEMES.map((item) => (
          <option key={item.value} value={item.value} className="bg-slate-800">
            {item.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
        <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
      </div>
    </div>
  );
}
