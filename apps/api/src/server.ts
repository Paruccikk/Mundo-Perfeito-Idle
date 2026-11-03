import { execFileSync } from 'node:child_process';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import { MemoryCharacterRepository } from './game/characterRepository.js';
import { PrismaCharacterRepository } from './game/prismaCharacterRepository.js';
import { createCharacterRoutes } from './routes/characters.js';

const app = Fastify({ logger: true });
const startedAt = Date.now();
const databaseConfigured = Boolean(process.env.DATABASE_URL);
let prisma: PrismaClient | undefined;

if (databaseConfigured) {
  // Aplica apenas migrations versionadas antes de aceitar tráfego.
  execFileSync('npx', ['prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'], {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
  prisma = new PrismaClient();
}

const rawOrigins = process.env.WEB_ORIGIN;
const allowedOrigins = (rawOrigins ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

await app.register(cors, {
  origin: allowedOrigins.length > 0 ? allowedOrigins : true
});

app.get('/health', async () => ({
  status: 'ok',
  project: 'mundo-perfeito',
  version: '0.3.0',
  storage: databaseConfigured ? 'postgres' : 'memory',
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
  note: databaseConfigured
    ? 'Progresso salvo no PostgreSQL.'
    : 'Modo de teste em memória: configure DATABASE_URL para persistir o progresso.'
}));

const repository = prisma
  ? new PrismaCharacterRepository(prisma)
  : new MemoryCharacterRepository();

await app.register(createCharacterRoutes(repository));

app.addHook('onClose', async () => {
  await prisma?.$disconnect();
});

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: '0.0.0.0' });
