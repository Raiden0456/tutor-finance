import { defineMiddleware } from 'astro:middleware';
import { getServerSession, safeRelativePath } from '@/lib/auth-server';
import { localizePath, normalizeLocale, stripLocale } from '@/lib/i18n';

const PUBLIC_ROUTES = new Set(['/login', '/sign-up', '/forgot-password', '/reset-password', '/404']);

export const onRequest = defineMiddleware(async (ctx, next) => {
  const url = new URL(ctx.request.url);
  const { pathname } = url;
  const cleanPathname = stripLocale(pathname).replace(/\/+$/, '') || '/';
  const locale = normalizeLocale(ctx.currentLocale);

  // The /api/* proxy must stay reachable unauthenticated for Better Auth; the API authorises the rest.
  if (pathname.startsWith('/api/')) {
    return next();
  }

  if (PUBLIC_ROUTES.has(cleanPathname)) {
    return next();
  }

  const cookie = ctx.request.headers.get('cookie') ?? undefined;
  const session = await getServerSession(cookie);

  if (!session.user) {
    const loginPath = localizePath('/login', locale);
    const returnTo = safeRelativePath(`${pathname}${url.search}`, '/');
    const isHome = stripLocale(returnTo) === '/';
    return ctx.redirect(isHome ? loginPath : `${loginPath}?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return next();
});
