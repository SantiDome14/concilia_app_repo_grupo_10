// ════════════════════════════════════════════════════════════════════
// MSW node server — test-environment counterpart of `./browser.ts`
// ────────────────────────────────────────────────────────────────────
// Uses `SetupServerApi` directly so we can install only HTTP
// interceptors. The default `setupServer()` factory also bundles
// `WebSocketInterceptor`, which conflicts with the `useWebSocket`
// spec's `FakeWebSocket` global override and breaks unrelated tests.
// ════════════════════════════════════════════════════════════════════

import { SetupServerApi } from 'msw/node';
import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest';
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest';
import { FetchInterceptor } from '@mswjs/interceptors/fetch';
import { handlers } from './handlers';

export const server = new SetupServerApi(handlers, [
  new ClientRequestInterceptor(),
  new XMLHttpRequestInterceptor(),
  new FetchInterceptor(),
]);
