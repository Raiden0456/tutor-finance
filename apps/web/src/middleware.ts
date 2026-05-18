import { defineMiddleware } from 'astro:middleware';
import { getServerSession } from '@/lib/auth-server';

const PUBLIC_ROUTES = ['/login', '/sign-up', '/forgot-password', '/reset-password'];

export const onRequest = defineMiddleware(async (ctx, next) => {
  const pathname = new URL(ctx.request.url).pathname;

  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return next();
  }

  const cookie = ctx.request.headers.get('cookie') ?? undefined;

  // In cross-domain deployments (e.g. Render without a custom domain) the
  // browser never sends the API-scoped session cookie to the web server, so
  // SSR cannot verify the session.  Only redirect server-side when we can
  // actually see the session token; otherwise the client-side AuthGuard takes
  // over.
  if (cookie?.includes('better-auth.session_token')) {
    const session = await getServerSession(cookie);
    if (!session.user) {
      return ctx.redirect('/login');
    }
  }

  return next();
});
