import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export interface CurrentUserData {
  id: string;
  email: string;
  emailVerified: boolean;
  name?: string | null;
}

interface SessionUser {
  id: string;
  email: string;
  emailVerified?: boolean | null;
  name?: string | null;
}

interface RequestWithSession {
  session?: { user?: SessionUser } | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const req = ctx.switchToHttp().getRequest<RequestWithSession>();
    const user = req?.session?.user;
    if (!user?.id) {
      throw new UnauthorizedException('Not authenticated');
    }
    return {
      id: user.id,
      email: user.email,
      emailVerified: !!user.emailVerified,
      name: user.name,
    };
  },
);
