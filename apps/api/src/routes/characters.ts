import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { isCharacterClassId } from '../game/classes.js';
import { CharacterError, CharacterService } from '../game/characterService.js';
import { validateCreateCharacter } from '../game/validation.js';
import type { CharacterRepository } from '../game/characterRepository.js';

const authenticate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({
      error: { code: 'unauthorized', message: 'Faça login para acessar seus personagens.' }
    });
  }
};

function accountId(request: FastifyRequest): string {
  return (request.user as { sub: string }).sub;
}

export function createCharacterRoutes(repository: CharacterRepository) {
  const service = new CharacterService(repository);

  return async function characterRoutes(app: FastifyInstance): Promise<void> {
    app.get('/api/v1/game/classes', async () => ({
      classes: service.listClasses()
    }));

    app.post('/api/v1/characters', { preHandler: authenticate }, async (request, reply) => {
      try {
        const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body)
          ? { ...(request.body as Record<string, unknown>), playerId: accountId(request) }
          : request.body;
        const validation = validateCreateCharacter(body, isCharacterClassId);
        if (!validation.ok) {
          throw new CharacterError('validation_error', 400, 'Revise os dados do personagem.', validation.details);
        }
        const character = await service.createCharacter(validation.value);
        return reply.status(201).send({ character });
      } catch (error) {
        return sendError(reply, error);
      }
    });

    app.get('/api/v1/characters', { preHandler: authenticate }, async (request, reply) => {
      try {
        const characters = await service.listCharacters(accountId(request));
        return reply.send({ characters });
      } catch (error) {
        return sendError(reply, error);
      }
    });

    app.get('/api/v1/characters/:id/combat', { preHandler: authenticate }, async (request, reply) => {
      try {
        const params = request.params as { id: string };
        const snapshot = await service.getCombat(params.id, accountId(request));
        return reply.send(snapshot);
      } catch (error) {
        return sendError(reply, error);
      }
    });

    app.get('/api/v1/characters/:id', { preHandler: authenticate }, async (request, reply) => {
      try {
        const params = request.params as { id: string };
        const character = await service.getCharacter(params.id, accountId(request));
        return reply.send({ character });
      } catch (error) {
        return sendError(reply, error);
      }
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
  return reply.status(500).send({
    error: { code: 'internal_error', message: 'Erro inesperado no servidor.' }
  });
}
