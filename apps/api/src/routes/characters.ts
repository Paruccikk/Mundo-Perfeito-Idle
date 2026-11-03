import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { isCharacterClassId } from '../game/classes.js';
import { CharacterError, CharacterService } from '../game/characterService.js';
import { validateCreateCharacter } from '../game/validation.js';
import type { CharacterRepository } from '../game/characterRepository.js';

export function createCharacterRoutes(repository: CharacterRepository) {
  const service = new CharacterService(repository);

  return async function characterRoutes(app: FastifyInstance): Promise<void> {
    app.get('/api/v1/game/classes', async () => ({
      classes: service.listClasses()
    }));

    app.post('/api/v1/characters', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const validation = validateCreateCharacter(request.body, isCharacterClassId);
        if (!validation.ok) {
          throw new CharacterError(
            'validation_error',
            400,
            'Revise os dados do personagem.',
            validation.details
          );
        }

        const character = await service.createCharacter(validation.value);
        return reply.status(201).send({ character });
      } catch (error) {
        return sendError(reply, error);
      }
    });

    app.get('/api/v1/characters', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { playerId } = request.query as { playerId?: unknown };
        const characters = await service.listCharacters(playerId);
        return reply.send({ characters });
      } catch (error) {
        return sendError(reply, error);
      }
    });

    app.get(
      '/api/v1/characters/:id/combat',
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        try {
          const { playerId } = request.query as { playerId?: unknown };
          const snapshot = await service.getCombat(request.params.id, playerId);
          return reply.send(snapshot);
        } catch (error) {
          return sendError(reply, error);
        }
      }
    );

    app.get(
      '/api/v1/characters/:id',
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        try {
          const { playerId } = request.query as { playerId?: unknown };
          const character = await service.getCharacter(request.params.id, playerId);
          return reply.send({ character });
        } catch (error) {
          return sendError(reply, error);
        }
      }
    );
  };
}

function sendError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof CharacterError) {
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {})
      }
    });
  }

  reply.log.error({ err: error }, 'unhandled character route error');
  return reply.status(500).send({
    error: {
      code: 'internal_error',
      message: 'Erro inesperado no servidor.'
    }
  });
}
