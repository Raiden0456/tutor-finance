import { Query, Resolver } from '@nestjs/graphql';
import { Public } from '@thallesp/nestjs-better-auth';

@Resolver()
export class HealthResolver {
  @Query(() => String)
  @Public()
  health(): string {
    return 'ok';
  }
}
