import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { WebSocket } from 'ws';

type CharacterClassId = 'warrior' | 'mage' | 'priest' | 'archer';

interface CityPlayer {
  id: string;
  name: string;
  classId: CharacterClassId;
  level: number;
  x: number;
  y: number;
}

interface ConnectedPlayer extends CityPlayer {
  accountId: string;
  socket: WebSocket;
  lastMoveAt: number;
  lastChatAt: number;
}

const CLASS_IDS = new Set<CharacterClassId>(['warrior', 'mage', 'priest', 'archer']);
const MAX_CITY_PLAYERS = 50;
const MAX_CHAT_LENGTH = 180;

export function createCityRoutes(prisma: PrismaClient) {
  return async function cityRoutes(app: FastifyInstance): Promise<void> {
    const players = new Map<string, ConnectedPlayer>();
    const allowedOrigins = (process.env.WEB_ORIGIN ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    const send = (socket: ConnectedPlayer['socket'], payload: unknown): void => {
      if (socket.readyState === 1) socket.send(JSON.stringify(payload));
    };

    const broadcast = (payload: unknown, exceptId?: string): void => {
      for (const player of players.values()) {
        if (player.id !== exceptId) send(player.socket, payload);
      }
    };

    const publicPlayer = (player: ConnectedPlayer): CityPlayer => ({
      id: player.id,
      name: player.name,
      classId: player.classId,
      level: player.level,
      x: player.x,
      y: player.y
    });

    app.get('/api/v1/city/socket', {
      websocket: true,
      preValidation: async (request: FastifyRequest, reply: FastifyReply) => {
        const origin = request.headers.origin;
        if (allowedOrigins.length > 0 && origin && !allowedOrigins.includes(origin)) {
          return reply.code(403).send({ error: 'Origin não autorizado.' });
        }
      }
    }, async (socket, request) => {
      const query = request.query as { characterId?: string };
      const characterId = typeof query.characterId === 'string' ? query.characterId : '';
      const rawProtocols = request.headers['sec-websocket-protocol'];
      const protocols = (Array.isArray(rawProtocols) ? rawProtocols : [rawProtocols ?? ''])
        .flatMap((value) => value.split(','))
        .map((value) => value.trim());
      const authProtocol = protocols.find((value) => value.startsWith('mp-auth.'));
      const token = authProtocol?.slice('mp-auth.'.length);

      if (!token || !characterId) {
        socket.close(1008, 'Autenticação necessária');
        return;
      }

      let accountId: string;
      try {
        const claims = app.jwt.verify<{ sub: string }>(token);
        accountId = claims.sub;
      } catch {
        socket.close(1008, 'Sessão inválida');
        return;
      }

      const character = await prisma.character.findFirst({
        where: { id: characterId, accountId },
        select: { id: true, name: true, classId: true, level: true }
      });
      if (!character || !CLASS_IDS.has(character.classId as CharacterClassId)) {
        socket.close(1008, 'Personagem inválido');
        return;
      }

      const previous = players.get(character.id);
      if (!previous && players.size >= MAX_CITY_PLAYERS) {
        socket.close(1013, 'Cidade cheia');
        return;
      }
      if (previous) previous.socket.close(4001, 'Personagem conectado em outra sessão');

      const player: ConnectedPlayer = {
        id: character.id,
        accountId,
        name: character.name,
        classId: character.classId as CharacterClassId,
        level: character.level,
        x: -45,
        y: 105,
        socket,
        lastMoveAt: 0,
        lastChatAt: 0
      };
      players.set(player.id, player);

      send(socket, {
        type: 'welcome',
        players: [...players.values()].filter((entry) => entry.id !== player.id).map(publicPlayer),
        onlineCount: players.size
      });
      broadcast({ type: 'player_joined', player: publicPlayer(player), onlineCount: players.size }, player.id);

      socket.on('message', (raw) => {
        if (players.get(player.id) !== player) return;
        let payload: unknown;
        try {
          payload = JSON.parse(raw.toString());
        } catch {
          return;
        }
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;
        const message = payload as Record<string, unknown>;
        const now = Date.now();

        if (message.type === 'move') {
          if (now - player.lastMoveAt < 55) return;
          const x = Number(message.x);
          const y = Number(message.y);
          if (!Number.isFinite(x) || !Number.isFinite(y)) return;
          const elapsed = player.lastMoveAt === 0 ? 1000 : now - player.lastMoveAt;
          const distance = Math.hypot(x - player.x, y - player.y);
          if (distance > elapsed * 0.12 + 20) return;
          player.lastMoveAt = now;
          player.x = Math.max(-390, Math.min(390, x));
          player.y = Math.max(-235, Math.min(245, y));
          broadcast({ type: 'player_moved', playerId: player.id, x: player.x, y: player.y }, player.id);
          return;
        }

        if (message.type === 'chat') {
          if (now - player.lastChatAt < 900) return;
          const text = typeof message.message === 'string' ? message.message.trim().slice(0, MAX_CHAT_LENGTH) : '';
          if (!text) return;
          player.lastChatAt = now;
          broadcast({
            type: 'chat_message',
            playerId: player.id,
            name: player.name,
            message: text,
            sentAt: now
          });
        }
      });

      socket.on('close', () => {
        if (players.get(player.id) !== player) return;
        players.delete(player.id);
        broadcast({ type: 'player_left', playerId: player.id, name: player.name, onlineCount: players.size });
      });
      socket.on('error', () => {
        // O evento close remove a presença sem interromper as outras conexões.
      });
    });
  };
}
