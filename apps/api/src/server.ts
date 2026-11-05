import { execFileSync } from 'node:child_process';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import jwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';
import { MemoryCharacterRepository } from './game/characterRepository.js';
import { PrismaCharacterRepository } from './game/prismaCharacterRepository.js';
import { createAuthRoutes } from './routes/auth.js';
import { createCharacterRoutes } from './routes/characters.js';
import { createCityRoutes } from './routes/city.js';

const app = Fastify({ logger: true });
const startedAt = Date.now();
const databaseConfigured = Boolean(process.env.DATABASE_URL);
let prisma: PrismaClient | undefined;

if (databaseConfigured) {
  execFileSync('npx', ['prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'], {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
  prisma = new PrismaClient();
}

const jwtSecret = process.env.JWT_SECRET;
if (databaseConfigured && (!jwtSecret || jwtSecret.length < 32)) {
  throw new Error('JWT_SECRET precisa estar configurado com pelo menos 32 caracteres.');
}
if (jwtSecret) {
  await app.register(jwt, { secret: jwtSecret });
}

const rawOrigins = process.env.WEB_ORIGIN;
const allowedOrigins = (rawOrigins ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

await app.register(cors, {
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  allowedHeaders: ['Content-Type', 'Authorization']
});

await app.register(websocket, { options: { maxPayload: 4096 } });

app.get('/health', async () => ({
  status: 'ok',
  project: 'mundo-perfeito',
  version: '0.5.0',
  storage: databaseConfigured ? 'postgres' : 'memory',
  authentication: Boolean(jwtSecret && prisma),
  databaseConfigured,
  uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000)
}));

app.get('/api/v1/game/config', async () => ({
  title: 'Mundo Perfeito',
  mode: 'idle',
  client: 'web',
  offlineCapHours: 8,
  maxCharactersPerPlayer: 3,
  persistence: databaseConfigured,
  authentication: Boolean(jwtSecret && prisma)
}));

if (prisma) {
  await app.register(createAuthRoutes(prisma));
}

const repository = prisma
  ? new PrismaCharacterRepository(prisma)
  : new MemoryCharacterRepository();

await app.register(createCharacterRoutes(repository));
if (prisma) await app.register(createCityRoutes(prisma));

app.addHook('onClose', async () => {
  await prisma?.$disconnect();
});

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: '0.0.0.0' });
