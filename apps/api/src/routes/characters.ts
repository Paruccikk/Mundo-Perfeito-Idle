import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { isCharacterClassId } from '../game/classes.js';
import { CharacterError, CharacterService } from '../game/characterService.js';
import { validateCreateCharacter } from '../game/validation.js';
import type { CharacterRepository } from '../game/characterRepository.js';

const authenticate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try { await request.jwtVerify(); }
  catch { reply.status(401).send({ error: { code: 'unauthorized', message: 'Faça login para acessar seus personagens.' } }); }
};

function accountId(request: FastifyRequest): string {
  return (request.user as { sub: string }).sub;
}

export function createCharacterRoutes(repository: CharacterRepository) {
  const service = new CharacterService(repository);
  return async function characterRoutes(app: FastifyInstance): Promise<void> {
    app.get('/api/v1/game/classes', async () => ({ classes: service.listClasses() }));

    app.post('/api/v1/characters', { preHandler: authenticate }, async (request, reply) => {
      try {
        const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body)
          ? { ...(request.body as Record<string, unknown>), playerId: accountId(request) } : request.body;
        const validation = validateCreateCharacter(body, isCharacterClassId);
        if (!validation.ok) throw new CharacterError('validation_error', 400, 'Revise os dados do personagem.', validation.details);
        const character = await service.createCharacter(validation.value);
        return reply.status(201).send({ character });
      } catch (error) { return sendError(reply, error); }
    });

    app.get('/api/v1/characters', { preHandler: authenticate }, async (request, reply) => {
      try { return reply.send({ characters: await service.listCharacters(accountId(request)) }); }
      catch (error) { return sendError(reply, error); }
    });

    app.get('/api/v1/characters/:id/combat', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        return reply.send(await service.getCombat(id, accountId(request)));
      } catch (error) { return sendError(reply, error); }
    });

    app.get('/api/v1/characters/:id/inventory', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        return reply.send(await service.getInventory(id, accountId(request)));
      } catch (error) { return sendError(reply, error); }
    });

    app.post('/api/v1/characters/:id/equip', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as { inventoryItemId?: unknown } | null;
        if (!body || typeof body.inventoryItemId !== 'string' || body.inventoryItemId.length > 128) {
          throw new CharacterError('validation_error', 400, 'Informe o item do inventário que deseja equipar.');
        }
        return reply.send(await service.equipItem(id, accountId(request), body.inventoryItemId));
      } catch (error) { return sendError(reply, error); }
    });

    app.post('/api/v1/characters/:id/attributes', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body)
          ? request.body as Record<string, unknown> : {};
        const allowed = ['constitution', 'strength', 'intelligence', 'dexterity'];
        const allocation: Record<string, number> = {};
        for (const [key, value] of Object.entries(body)) {
          if (!allowed.includes(key) || !Number.isInteger(value) || (value as number) < 0) {
            throw new CharacterError('validation_error', 400, 'Use somente pontos inteiros positivos nos atributos permitidos.');
          }
          allocation[key] = value as number;
        }
        return reply.send({ character: await service.allocateAttributes(id, accountId(request), allocation) });
      } catch (error) { return sendError(reply, error); }
    });

    app.get('/api/v1/characters/:id', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        return reply.send({ character: await service.getCharacter(id, accountId(request)) });
      } catch (error) { return sendError(reply, error); }
    });
  };
}

function sendError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof CharacterError) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) }
    });
  }
  reply.log.error({ err: error }, 'unhandled character route error');
  return reply.status(500).send({ error: { code: 'internal_error', message: 'Erro inesperado no servidor.' } });
}
