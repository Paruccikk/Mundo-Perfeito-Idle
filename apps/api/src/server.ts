import Fastify from 'fastify';
import cors from '@fastify/cors';
import { MemoryCharacterRepository } from './game/characterRepository.js';
import { createCharacterRoutes } from './routes/characters.js';

const app = Fastify({ logger: true });
const startedAt = Date.now();

const rawOrigins = process.env.WEB_ORIGIN;
const allowedOrigins = (rawOrigins ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

// Sem WEB_ORIGIN definido (ex.: primeiro deploy), reflete a origem da requisição.
// Em produção, configure WEB_ORIGIN com a URL do cliente para restringir o CORS.
await app.register(cors, {
  origin: allowedOrigins.length > 0 ? allowedOrigins : true
});

app.get('/health', async () => ({
  status: 'ok',
  project: 'mundo-perfeito',
  version: '0.2.0',
  storage: 'memory',
  uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000)
}));

app.get('/api/v1/game/config', async () => ({
  title: 'Mundo Perfeito',
  mode: 'idle',
  client: 'web',
  offlineCapHours: 8,
  maxCharactersPerPlayer: 3,
  note: 'Configuração demonstrativa; valores finais serão balanceados.'
}));

await app.register(createCharacterRoutes(new MemoryCharacterRepository()));

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: '0.0.0.0' });
