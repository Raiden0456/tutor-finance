import { defineMiddleware } from 'astro:middleware';
import { getServerSession } from '@/lib/auth-server';

const PUBLIC_ROUTES = ['/login', '/sign-up', '/forgot-password', '/reset-password'];

export const onRequest = defineMiddleware(async (ctx, next) => {
  const pathname = new URL(ctx.request.url).pathname;

  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return next();
  }

  const cookie = ctx.request.headers.get('cookie') ?? undefined;
  const session = await getServerSession(cookie);

  if (!session.user) {
    return ctx.redirect('/login');
  }

  return next();
});
