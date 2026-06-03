import { Hero } from './Hero';
import { Sidebar } from './Sidebar';
import { ThemeSelector } from './ThemeSelector';

export function Layout() {
  return (
    <div className="relative flex min-h-screen w-full flex-col md:h-screen md:flex-row">
      <ThemeSelector />
      <Sidebar />
      <Hero />
    </div>
  );
}
