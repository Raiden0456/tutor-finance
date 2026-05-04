import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from './transaction.schema.js';
import { TransactionsService } from './transactions.service.js';
import { TransactionsResolver } from './transactions.resolver.js';
import { FxModule } from '../fx/fx.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Transaction.name, schema: TransactionSchema }]),
    FxModule,
  ],
  providers: [TransactionsService, TransactionsResolver],
  exports: [TransactionsService],
})
export class TransactionsModule {}
