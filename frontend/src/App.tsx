import { Layout } from './components/Layout';
import { StoreProvider } from './state/store';
import { ThemeProvider } from './state/themeStore';

export function App() {
  return (
    <ThemeProvider>
      <StoreProvider>
        <Layout />
      </StoreProvider>
    </ThemeProvider>
  );
}
