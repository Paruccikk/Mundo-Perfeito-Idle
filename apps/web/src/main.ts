import Phaser from 'phaser';
import type { CharacterSummary } from '@mundo-perfeito/shared';
import { ApiError, api } from './api';
import {
  clearStoredCharacterId,
  getPlayerId,
  getStoredCharacterId,
  storeCharacterId
} from './player';
import { WorldScene } from './scenes/WorldScene';
import { renderCharacterCreator } from './ui/creator';
import { renderFatalError, renderLoading } from './ui/screens';
import './style.css';

const uiRoot = document.getElementById('ui-root');

if (!uiRoot) {
  throw new Error('Elemento #ui-root não encontrado no index.html');
}

const playerId = getPlayerId();
let game: Phaser.Game | null = null;

async function bootstrap(): Promise<void> {
  renderLoading(uiRoot as HTMLElement, 'Conectando ao servidor…');

  const storedCharacterId = getStoredCharacterId();

  if (storedCharacterId) {
    try {
      const character = await api.getCharacter(storedCharacterId, playerId);
      startGame(character);
      return;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        clearStoredCharacterId();
      } else {
        showConnectionError(error);
        return;
      }
    }
  }

  await showCharacterCreator();
}

async function showCharacterCreator(): Promise<void> {
  renderLoading(uiRoot as HTMLElement, 'Carregando classes…');

  try {
    const classes = await api.listClasses();

    renderCharacterCreator(uiRoot as HTMLElement, {
      classes,
      onCreate: async ({ name, classId }) => {
        const character = await api.createCharacter({ playerId, name, classId });
        storeCharacterId(character.id);
        startGame(character);
      }
    });
  } catch (error) {
    showConnectionError(error);
  }
}

function startGame(character: CharacterSummary): void {
  game?.destroy(true);

  (uiRoot as HTMLElement).replaceChildren();

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#172638',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 960,
      height: 600
    },
    scene: [WorldScene],
    render: { pixelArt: true, antialias: false },
    callbacks: {
      preBoot: (instance) => {
        instance.registry.set('character', character);
      }
    }
  };

  game = new Phaser.Game(config);
  addGameTools();
}

function addGameTools(): void {
  const tools = document.createElement('div');
  tools.className = 'game-tools';

  const switchButton = document.createElement('button');
  switchButton.className = 'ghost-button';
  switchButton.type = 'button';
  switchButton.textContent = 'Trocar personagem';
  switchButton.addEventListener('click', () => {
    clearStoredCharacterId();
    window.location.reload();
  });

  tools.append(switchButton);
  (uiRoot as HTMLElement).append(tools);
}

function showConnectionError(error: unknown): void {
  const message =
    error instanceof Error
      ? error.message
      : 'Não foi possível conectar ao servidor do jogo.';

  renderFatalError(uiRoot as HTMLElement, message, () => {
    void bootstrap();
  });
}

void bootstrap().catch(showConnectionError);
