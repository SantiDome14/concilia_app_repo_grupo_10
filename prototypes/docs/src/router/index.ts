import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'introduction',
    component: () => import('@/pages/IntroductionPage.vue'),
    meta: { title: 'Introduction' },
  },
  {
    path: '/authentication',
    name: 'authentication',
    component: () => import('@/pages/AuthenticationPage.vue'),
    meta: { title: 'Authentication' },
  },
  {
    path: '/errors',
    name: 'errors',
    component: () => import('@/pages/ErrorsPage.vue'),
    meta: { title: 'Errors & rate limits' },
  },
  {
    path: '/versioning',
    name: 'versioning',
    component: () => import('@/pages/VersioningPage.vue'),
    meta: { title: 'Versioning' },
  },
  {
    path: '/api/market-data/get-prices',
    name: 'get-prices',
    component: () => import('@/pages/api/market-data/GetPricesPage.vue'),
    meta: { title: 'GET /prices/{pair}' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: { title: 'Not Found' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: 'smooth' };
    return { top: 0 };
  },
});

router.afterEach((to) => {
  const baseTitle = 'Ardua API Documentation';
  const pageTitle = to.meta?.title as string | undefined;
  document.title = pageTitle ? `${pageTitle} · ${baseTitle}` : baseTitle;
});

export default router;
