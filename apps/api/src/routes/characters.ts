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
    app.get('/api/v1/game/stages', async () => service.listStages());

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

    app.post('/api/v1/characters/:id/town', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        return reply.send(await service.enterTown(id, accountId(request)));
      } catch (error) { return sendError(reply, error); }
    });

    app.post('/api/v1/characters/:id/travel', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as { stageId?: unknown } | null;
        if (!body || typeof body.stageId !== 'string' || body.stageId.length > 64) {
          throw new CharacterError('validation_error', 400, 'Informe a fase de destino.');
        }
        return reply.send(await service.travel(id, accountId(request), body.stageId));
      } catch (error) { return sendError(reply, error); }
    });

    app.get('/api/v1/characters/:id/inventory', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        return reply.send(await service.getInventory(id, accountId(request)));
      } catch (error) { return sendError(reply, error); }
    });

    app.post('/api/v1/characters/:id/sell-item', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as { inventoryItemId?: unknown; quantity?: unknown } | null;
        if (!body || typeof body.inventoryItemId !== 'string' || body.inventoryItemId.length > 128 ||
            typeof body.quantity !== 'number' || !Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 9999) {
          throw new CharacterError('validation_error', 400, 'Informe o item e a quantidade que deseja vender.');
        }
        return reply.send(await service.sellItem(id, accountId(request), body.inventoryItemId, body.quantity));
      } catch (error) { return sendError(reply, error); }
    });

    app.post('/api/v1/characters/:id/use-item', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as { inventoryItemId?: unknown } | null;
        if (!body || typeof body.inventoryItemId !== 'string' || body.inventoryItemId.length > 128) throw new CharacterError('validation_error', 400, 'Informe o item que deseja usar.');
        return reply.send(await service.useItem(id, accountId(request), body.inventoryItemId));
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

    app.post('/api/v1/characters/:id/mount', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as { equipped?: unknown } | null;
        if (!body || typeof body.equipped !== 'boolean') throw new CharacterError('validation_error', 400, 'Informe se deseja montar ou desmontar.');
        return reply.send(await service.setMount(id, accountId(request), body.equipped));
      } catch (error) { return sendError(reply, error); }
    });

    app.post('/api/v1/characters/:id/unequip', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as { slot?: unknown } | null;
        const slots = ['weapon', 'head', 'chest', 'legs', 'boots', 'accessory'];
        if (!body || typeof body.slot !== 'string' || !slots.includes(body.slot)) {
          throw new CharacterError('validation_error', 400, 'Informe um espaço de equipamento válido.');
        }
        return reply.send(await service.unequipItem(id, accountId(request), body.slot));
      } catch (error) { return sendError(reply, error); }
    });

    app.post('/api/v1/characters/:id/skills/:skillId/cast', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id, skillId } = request.params as { id: string; skillId: string };
        if (skillId.length > 64) throw new CharacterError('validation_error', 400, 'Habilidade inválida.');
        return reply.send(await service.castSkill(id, accountId(request), skillId));
      } catch (error) { return sendError(reply, error); }
    });

    app.post('/api/v1/characters/:id/skills/:skillId/upgrade', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id, skillId } = request.params as { id: string; skillId: string };
        if (skillId.length > 64) throw new CharacterError('validation_error', 400, 'Habilidade inválida.');
        return reply.send(await service.upgradeSkill(id, accountId(request), skillId));
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

    app.get('/api/v1/characters/:id/farm', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        return reply.send(await service.getFarm(id, accountId(request)));
      } catch (error) { return sendError(reply, error); }
    });

    app.post('/api/v1/characters/:id/farm/buy-building', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as { buildingId?: unknown } | null;
        if (!body || typeof body.buildingId !== 'string' || !['coop', 'corral', 'stable'].includes(body.buildingId)) {
          throw new CharacterError('validation_error', 400, 'Informe uma construção válida (galinheiro, curral ou estábulo).');
        }
        return reply.send(await service.buyFarmBuilding(id, accountId(request), body.buildingId as 'coop' | 'corral' | 'stable'));
      } catch (error) { return sendError(reply, error); }
    });

    app.post('/api/v1/characters/:id/farm/buy-animal', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as { animalId?: unknown; name?: unknown } | null;
        if (!body || typeof body.animalId !== 'string' || body.animalId.length > 64) {
          throw new CharacterError('validation_error', 400, 'Informe o animal que deseja comprar.');
        }
        const customName = typeof body.name === 'string' ? body.name.slice(0, 32) : undefined;
        return reply.send(await service.buyFarmAnimal(id, accountId(request), body.animalId, customName));
      } catch (error) { return sendError(reply, error); }
    });

    app.post('/api/v1/characters/:id/farm/plant', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as { plotIndex?: unknown; cropId?: unknown } | null;
        if (!body || typeof body.plotIndex !== 'number' || !Number.isInteger(body.plotIndex) ||
            typeof body.cropId !== 'string' || !['corn', 'wheat', 'carrot'].includes(body.cropId)) {
          throw new CharacterError('validation_error', 400, 'Informe o canteiro e a semente que deseja plantar.');
        }
        return reply.send(await service.plantFarmCrop(id, accountId(request), body.plotIndex, body.cropId as 'corn' | 'wheat' | 'carrot'));
      } catch (error) { return sendError(reply, error); }
    });

    app.post('/api/v1/characters/:id/farm/harvest', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as { plotIndex?: unknown } | null;
        if (!body || typeof body.plotIndex !== 'number' || !Number.isInteger(body.plotIndex)) {
          throw new CharacterError('validation_error', 400, 'Informe o canteiro que deseja colher.');
        }
        return reply.send(await service.harvestFarmCrop(id, accountId(request), body.plotIndex));
      } catch (error) { return sendError(reply, error); }
    });

    app.post('/api/v1/characters/:id/farm/buy-seeds', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as { cropId?: unknown; quantity?: unknown } | null;
        if (!body || !['corn', 'wheat', 'carrot'].includes(String(body.cropId)) ||
            typeof body.quantity !== 'number' || !Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 10) {
          throw new CharacterError('validation_error', 400, 'Informe a semente e uma quantidade entre 1 e 10.');
        }
        return reply.send(await service.buyFarmSeeds(id, accountId(request), body.cropId as 'corn' | 'wheat' | 'carrot', body.quantity));
      } catch (error) { return sendError(reply, error); }
    });

    app.post('/api/v1/characters/:id/farm/water', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as { plotIndex?: unknown } | null;
        if (!body || typeof body.plotIndex !== 'number' || !Number.isInteger(body.plotIndex)) {
          throw new CharacterError('validation_error', 400, 'Informe o canteiro que deseja regar.');
        }
        return reply.send(await service.waterFarmCrop(id, accountId(request), body.plotIndex));
      } catch (error) { return sendError(reply, error); }
    });

    app.post('/api/v1/characters/:id/farm/craft-feed', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as { species?: unknown; quantity?: unknown } | null;
        if (!body || !['chicken', 'cow', 'horse'].includes(String(body.species)) ||
            typeof body.quantity !== 'number' || !Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 20) {
          throw new CharacterError('validation_error', 400, 'Informe o tipo de animal e uma quantidade entre 1 e 20.');
        }
        return reply.send(await service.craftFarmFeed(id, accountId(request), body.species as 'chicken' | 'cow' | 'horse', body.quantity));
      } catch (error) { return sendError(reply, error); }
    });

    app.post('/api/v1/characters/:id/farm/fill-trough', { preHandler: authenticate }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as { buildingId?: unknown; kind?: unknown; quantity?: unknown } | null;
        if (!body || !['coop', 'corral', 'stable'].includes(String(body.buildingId)) ||
            !['feed', 'water'].includes(String(body.kind)) ||
            typeof body.quantity !== 'number' || !Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 30) {
          throw new CharacterError('validation_error', 400, 'Informe a instalação, o tipo de abastecimento e uma quantidade entre 1 e 30.');
        }
        return reply.send(await service.fillFarmTrough(
          id, accountId(request), body.buildingId as 'coop' | 'corral' | 'stable',
          body.kind as 'feed' | 'water', body.quantity
        ));
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
