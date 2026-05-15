import type { RouteRecordName } from 'vue-router';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type SidebarItem = {
  label: string;
  to: string;
  routeName: RouteRecordName;
  method?: HttpMethod;
};

export type SidebarSection = {
  title: string;
  items: SidebarItem[];
  groups?: SidebarGroup[];
};

export type SidebarGroup = {
  title: string;
  items: SidebarItem[];
};

export const sidebar: SidebarSection[] = [
  {
    title: 'Getting Started',
    items: [
      { label: 'Introduction', to: '/', routeName: 'introduction' },
      { label: 'Authentication', to: '/authentication', routeName: 'authentication' },
      { label: 'Errors & rate limits', to: '/errors', routeName: 'errors' },
      { label: 'Versioning', to: '/versioning', routeName: 'versioning' },
    ],
  },
  {
    title: 'API Reference',
    items: [],
    groups: [
      {
        title: 'Market Data',
        items: [
          {
            label: '/prices/{pair}',
            to: '/api/market-data/get-prices',
            routeName: 'get-prices',
            method: 'GET',
          },
        ],
      },
    ],
  },
];
