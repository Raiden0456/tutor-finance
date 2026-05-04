import { SERVER_API_URL } from './env';

export interface SessionUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

export interface ServerSession {
  user: SessionUser | null;
}

// Calls Better Auth's get-session endpoint via the api, forwarding the cookie.
export async function getServerSession(cookieHeader: string | undefined): Promise<ServerSession> {
  if (!cookieHeader) return { user: null };
  try {
    const res = await fetch(`${SERVER_API_URL}/api/auth/get-session`, {
      headers: { cookie: cookieHeader },
    });
    if (!res.ok) return { user: null };
    const data = (await res.json()) as { user?: SessionUser } | null;
    if (!data || !data.user) return { user: null };
    return { user: data.user };
  } catch {
    return { user: null };
  }
}
