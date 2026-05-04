import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  type NormalizedCacheObject,
} from '@apollo/client/core';
import { PUBLIC_API_URL, SERVER_API_URL } from './env';

export interface ServerFetchOptions {
  cookie?: string;
}

let browserClient: ApolloClient<NormalizedCacheObject> | undefined;

// Astro frontmatter (server) calls this to fetch GraphQL while forwarding the cookie.
export function getServerClient(opts: ServerFetchOptions = {}): ApolloClient<NormalizedCacheObject> {
  const link = new HttpLink({
    uri: `${SERVER_API_URL}/graphql`,
    fetch,
    headers: opts.cookie ? { cookie: opts.cookie } : {},
  });
  return new ApolloClient({
    link,
    cache: new InMemoryCache(),
    ssrMode: true,
    defaultOptions: {
      query: { fetchPolicy: 'no-cache', errorPolicy: 'all' },
    },
  });
}

// React islands call this — uses same-origin so the session cookie is sent.
export function getBrowserClient(): ApolloClient<NormalizedCacheObject> {
  if (browserClient) return browserClient;
  const link = new HttpLink({
    uri: `${PUBLIC_API_URL}/graphql`,
    credentials: 'include',
  });
  browserClient = new ApolloClient({
    link,
    cache: new InMemoryCache(),
  });
  return browserClient;
}
