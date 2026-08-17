/* One validation entry point (P0.6): unknown fields are rejected, not
   silently accepted — blocks mass assignment. Proved via Fastify inject. */
import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException, Body, Controller, Module, Post, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { IsString } from 'class-validator';

class CreateThingDto {
  @IsString()
  name!: string;
}

@Controller()
class TestController {
  @Post('thing')
  create(@Body() _dto: CreateThingDto): { ok: boolean } {
    return { ok: true };
  }
}

@Module({ controllers: [TestController] })
class TestModule {}

async function boot(): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [TestModule] }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({ message_key: 'validation.failed', details: errors.length }),
    })
  );
  await app.init();
  return app;
}

test('a request with an unknown field is rejected', async () => {
  const app = await boot();
  const res = await app.inject({
    method: 'POST',
    url: '/thing',
    payload: { name: 'ok', extra: 'sneaky' },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test('a request with only known fields is accepted', async () => {
  const app = await boot();
  const res = await app.inject({ method: 'POST', url: '/thing', payload: { name: 'ok' } });
  assert.equal(res.statusCode, 201);
  assert.equal(res.json().ok, true);
  await app.close();
});
