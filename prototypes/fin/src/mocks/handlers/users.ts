// ════════════════════════════════════════════════════════════════════
// MSW handlers — users
// ────────────────────────────────────────────────────────────────────
// Identity directory. `GET /users/me` returns the first seed entry —
// the convention for the dev user. Real apps override this when wiring
// auth (e.g. derive from Auth0 user claims server-side).
// ════════════════════════════════════════════════════════════════════

import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import { ENDPOINTS } from '@/api/endpoints';
import { randomDelayMs } from '../util';
import { usersSeed } from '../seed/users';

const LIST = `*${ENDPOINTS.users.list}`;
const ME = `*${ENDPOINTS.users.me}`;

export const userHandlers: HttpHandler[] = [
  http.get(LIST, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json(usersSeed);
  }),

  http.get(ME, async () => {
    await delay(randomDelayMs());
    const me = usersSeed[0];
    if (!me) {
      return HttpResponse.json(
        { message: 'No users in seed', code: 'NO_CURRENT_USER' },
        { status: 404 },
      );
    }
    return HttpResponse.json(me);
  }),
];
