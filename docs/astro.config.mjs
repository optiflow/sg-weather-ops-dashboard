// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: 'Weather Starter',
      sidebar: [
        {
          label: 'Guides',
          items: [
            { label: 'Getting Started', slug: 'guides/getting-started' },
            { label: 'Adding Locations', slug: 'guides/adding-locations' },
            { label: 'Weather Data Pipeline', slug: 'guides/weather-data' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'API Endpoints', slug: 'reference/api-endpoints' },
            { label: 'Database Schema', slug: 'reference/database-schema' },
            { label: 'Frontend Components', slug: 'reference/frontend-components' },
            { label: 'Configuration', slug: 'reference/configuration' },
          ],
        },
      ],
    }),
    mermaid(),
  ],
});
