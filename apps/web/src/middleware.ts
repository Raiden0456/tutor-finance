import { defineMiddleware } from 'astro:middleware';
import { getServerSession } from '@/lib/auth-server';
import { localizePath, normalizeLocale, stripLocale } from '@/lib/i18n';

const PUBLIC_ROUTES = ['/login', '/sign-up', '/forgot-password', '/reset-password'];

export const onRequest = defineMiddleware(async (ctx, next) => {
  const pathname = new URL(ctx.request.url).pathname;
  const cleanPathname = stripLocale(pathname);
  const locale = normalizeLocale(ctx.currentLocale);

  // The /api/* routes are the same-origin reverse proxy to the API. They must
  // never be gated by the page-auth middleware — Better Auth needs its own
  // sign-in/sign-up endpoints reachable while unauthenticated, and the API
  // itself is responsible for authorising the rest.
  if (pathname.startsWith('/api/')) {
    return next();
  }

  if (PUBLIC_ROUTES.some((r) => cleanPathname.startsWith(r))) {
    return next();
  }

  const cookie = ctx.request.headers.get('cookie') ?? undefined;
  const session = await getServerSession(cookie);

  if (!session.user) {
    return ctx.redirect(localizePath('/login', locale));
  }

  return next();
});
