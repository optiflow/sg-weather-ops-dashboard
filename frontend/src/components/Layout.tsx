import { Hero } from './Hero';
import { Sidebar } from './Sidebar';
import { ThemeSelector } from './ThemeSelector';

export function Layout() {
  return (
    <div className="flex h-full min-h-screen w-full relative">
      <ThemeSelector />
      <Sidebar />
      <Hero />
    </div>
  );
}
