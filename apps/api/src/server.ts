import Fastify from 'fastify';
import cors from '@fastify/cors';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173'
});

app.get('/health', async () => ({
  status: 'ok',
  project: 'mundo-perfeito',
  version: '0.1.0'
}));

app.get('/api/v1/game/config', async () => ({
  title: 'Mundo Perfeito',
  mode: 'idle',
  client: 'web',
  offlineCapHours: 8,
  note: 'Configuração demonstrativa; valores finais serão balanceados.'
}));

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: '0.0.0.0' });
