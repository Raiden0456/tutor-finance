export const SIGNUP_CLOSED = 'SIGNUP_CLOSED';

export const SIGNUP_MODES = ['open', 'invite'] as const;
export type SignupMode = (typeof SIGNUP_MODES)[number];
