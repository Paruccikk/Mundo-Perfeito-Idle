import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { PrismaClient } from '@prisma/client';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keyLength: number
) => Promise<Buffer>;

type AuthBody = { email?: unknown; password?: unknown; legacyPlayerId?: unknown };

export function createAuthRoutes(prisma: PrismaClient) {
  return async function authRoutes(app: FastifyInstance): Promise<void> {
    app.post('/api/v1/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
      const input = readCredentials(request.body);
      if (!input.ok) return reply.status(400).send({ error: { code: 'validation_error', message: input.message } });

      const existing = await prisma.account.findUnique({ where: { email: input.email } });
      if (existing) {
        return reply.status(409).send({ error: { code: 'email_taken', message: 'Este e-mail já possui uma conta.' } });
      }

      const passwordHash = await hashPassword(input.password);
      let account;
      if (input.legacyPlayerId) {
        const legacy = await prisma.account.findUnique({ where: { id: input.legacyPlayerId } });
        if (legacy?.email) {
          return reply.status(409).send({ error: { code: 'legacy_account_already_claimed', message: 'Este progresso já está vinculado a uma conta.' } });
        }
        account = legacy
          ? await prisma.account.update({
              where: { id: legacy.id },
              data: { email: input.email, passwordHash }
            })
          : await prisma.account.create({
              data: { id: randomUUID(), email: input.email, passwordHash }
            });
      } else {
        account = await prisma.account.create({
          data: { id: randomUUID(), email: input.email, passwordHash }
        });
      }
      return reply.status(201).send(await createSession(app, account.id, input.email));
    });

    app.post('/api/v1/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
      const input = readCredentials(request.body);
      if (!input.ok) return reply.status(400).send({ error: { code: 'validation_error', message: input.message } });

      const account = await prisma.account.findUnique({ where: { email: input.email } });
      if (!account?.passwordHash || !(await verifyPassword(input.password, account.passwordHash))) {
        return reply.status(401).send({ error: { code: 'invalid_credentials', message: 'E-mail ou senha incorretos.' } });
      }
      return reply.send(await createSession(app, account.id, input.email));
    });

    app.get('/api/v1/auth/me', {
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch {
          return reply.status(401).send({ error: { code: 'unauthorized', message: 'Faça login para continuar.' } });
        }
      }
    }, async (request, reply) => {
      const accountId = (request.user as { sub: string }).sub;
      const account = await prisma.account.findUnique({
        where: { id: accountId },
        select: { id: true, email: true }
      });
      if (!account) return reply.status(401).send({ error: { code: 'unauthorized', message: 'Conta não encontrada.' } });
      return reply.send({ account });
    });
  };
}

function readCredentials(body: unknown):
  | { ok: true; email: string; password: string; legacyPlayerId?: string }
  | { ok: false; message: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, message: 'Informe e-mail e senha.' };
  }
  const input = body as AuthBody;
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { ok: false, message: 'Informe um e-mail válido.' };
  }
  if (password.length < 10 || password.length > 128) {
    return { ok: false, message: 'A senha deve ter entre 10 e 128 caracteres.' };
  }
  const legacyPlayerId = typeof input.legacyPlayerId === 'string' ? input.legacyPlayerId : undefined;
  if (legacyPlayerId && !/^ply_[A-Za-z0-9_-]{8,64}$/.test(legacyPlayerId)) {
    return { ok: false, message: 'Não foi possível validar o progresso de visitante.' };
  }
  return { ok: true, email, password, ...(legacyPlayerId ? { legacyPlayerId } : {}) };
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, hash] = stored.split('$');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = await scrypt(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function createSession(app: FastifyInstance, accountId: string, email: string) {
  const token = app.jwt.sign({ sub: accountId, email }, { expiresIn: '7d' });
  return { token, account: { id: accountId, email } };
}
