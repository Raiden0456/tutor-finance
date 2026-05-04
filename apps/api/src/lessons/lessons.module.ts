import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Lesson, LessonSchema } from './lesson.schema.js';
import { LessonsService } from './lessons.service.js';
import { LessonsResolver } from './lessons.resolver.js';
import { StudentsModule } from '../students/students.module.js';
import { TransactionsModule } from '../transactions/transactions.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Lesson.name, schema: LessonSchema }]),
    StudentsModule,
    TransactionsModule,
  ],
  providers: [LessonsService, LessonsResolver],
  exports: [LessonsService],
})
export class LessonsModule {}
