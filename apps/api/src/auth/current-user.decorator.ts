import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export interface CurrentUserData {
  id: string;
  email: string;
  emailVerified: boolean;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const gql = GqlExecutionContext.create(ctx);
    const req = gql.getContext().req;
    const session = req?.session;
    if (!session?.user?.id) {
      throw new UnauthorizedException('Not authenticated');
    }
    return {
      id: session.user.id,
      email: session.user.email,
      emailVerified: !!session.user.emailVerified,
    };
  },
);
