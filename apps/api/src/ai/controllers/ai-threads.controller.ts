import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type {
  AiMessage,
  AiSendMessageResponse,
  AiStreamFrame,
  AiThread,
} from '@tutor-finance/shared';
import { CurrentUser, type CurrentUserData } from '../../auth/current-user.decorator.js';
import { CreateThreadDto, SendMessageDto, StreamQueryDto, ThreadsQueryDto } from '../dto/ai.dto.js';
import { AiRunsService, isTerminal } from '../services/ai-runs.service.js';
import { AiThreadsService } from '../services/ai-threads.service.js';

const HEARTBEAT_MS = 15_000;

@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller('ai/threads')
export class AiThreadsController {
  constructor(
    private readonly threads: AiThreadsService,
    private readonly runs: AiRunsService,
  ) {}

  @Get()
  list(@CurrentUser() user: CurrentUserData, @Query() q: ThreadsQueryDto): Promise<AiThread[]> {
    return this.threads.list(user.id, q.studentId);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserData, @Body() body: CreateThreadDto): Promise<AiThread> {
    return this.threads.create(user.id, body);
  }

  @Get(':id/messages')
  messages(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AiMessage[]> {
    return this.threads.messages(user.id, id);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ ok: true }> {
    await this.threads.remove(user.id, id);
    this.runs.stop(id);
    return { ok: true };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':id/messages')
  @HttpCode(202)
  send(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SendMessageDto,
  ): Promise<AiSendMessageResponse> {
    return this.runs.start(user.id, id, body.content.trim());
  }

  @Post(':id/stop')
  @HttpCode(200)
  async stop(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ stopped: boolean }> {
    await this.threads.findOwned(user.id, id);
    return { stopped: this.runs.stop(id) };
  }

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get(':id/stream')
  async stream(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: StreamQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.threads.findOwned(user.id, id);

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (frame: AiStreamFrame) => {
      if (res.writableEnded) return;
      const id = frame.seq > 0 ? `id: ${frame.seq}\n` : '';
      res.write(`${id}event: ${frame.event}\ndata: ${JSON.stringify(frame.data)}\n\n`);
      if (isTerminal(frame)) res.end();
    };

    const unsubscribe = this.runs.attach(id, q.after ?? 0, send);
    if (!unsubscribe) {
      send({ event: 'state', data: { running: false }, seq: 0 });
      res.end();
      return;
    }
    const heartbeat = setInterval(() => {
      if (!res.writableEnded) res.write(': ping\n\n');
    }, HEARTBEAT_MS);
    res.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  }
}
