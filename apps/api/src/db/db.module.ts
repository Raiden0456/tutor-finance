import { Global, Module } from '@nestjs/common';
import { getDb, getPool } from './client.js';

export const DB = Symbol('DB');
export const PG_POOL = Symbol('PG_POOL');

@Global()
@Module({
  providers: [
    { provide: PG_POOL, useFactory: () => getPool() },
    { provide: DB, useFactory: () => getDb() },
  ],
  exports: [DB, PG_POOL],
})
export class DbModule {}
