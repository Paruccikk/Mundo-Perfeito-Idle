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
import { createGameHud, type GameHud } from './ui/hud';
import { renderFatalError, renderLoading } from './ui/screens';
import { renderCharacterSelector } from './ui/selector';
import './style.css';

const MAX_CHARACTERS = 3;

const uiRoot = document.getElementById('ui-root');

if (!uiRoot) {
  throw new Error('Elemento #ui-root não encontrado no index.html');
}

const root = uiRoot as HTMLElement;
const playerId = getPlayerId();

let game: Phaser.Game | null = null;
let hud: GameHud | null = null;

async function bootstrap(): Promise<void> {
  renderLoading(root, 'Conectando ao servidor…');

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

  await showCharacterSelector();
}

async function showCharacterSelector(): Promise<void> {
  renderLoading(root, 'Carregando personagens…');

  try {
    const characters = await api.listCharacters(playerId);

    if (characters.length === 0) {
      await showCharacterCreator(false);
      return;
    }

    renderCharacterSelector(root, {
      characters,
      activeCharacterId: getStoredCharacterId(),
      maxCharacters: MAX_CHARACTERS,
      onSelect: (character) => {
        storeCharacterId(character.id);
        startGame(character);
      },
      onCreate: () => {
        void showCharacterCreator(true);
      }
    });
  } catch (error) {
    showConnectionError(error);
  }
}

async function showCharacterCreator(canGoBack: boolean): Promise<void> {
  renderLoading(root, 'Carregando classes…');

  try {
    const classes = await api.listClasses();

    renderCharacterCreator(root, {
      classes,
      onCreate: async ({ name, classId }) => {
        const character = await api.createCharacter({ playerId, name, classId });
        storeCharacterId(character.id);
        startGame(character);
      },
      onBack: canGoBack ? () => void showCharacterSelector() : undefined
    });
  } catch (error) {
    showConnectionError(error);
  }
}

function startGame(character: CharacterSummary): void {
  game?.destroy(true);
  hud?.destroy();
  root.replaceChildren();

  hud = createGameHud(root, {
    character,
    onSwitch: openCharacterSelector
  });

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#07111c',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 960,
      height: 600
    },
    scene: [WorldScene],
    render: { pixelArt: false, antialias: true, roundPixels: false },
    callbacks: {
      preBoot: (instance) => {
        instance.registry.set('character', character);
        instance.registry.set('playerId', playerId);
        instance.registry.set('hud', hud);
      }
    }
  };

  game = new Phaser.Game(config);
}

function openCharacterSelector(): void {
  game?.destroy(true);
  game = null;
  hud?.destroy();
  hud = null;
  void showCharacterSelector();
}

function showConnectionError(error: unknown): void {
  const message =
    error instanceof Error
      ? error.message
      : 'Não foi possível conectar ao servidor do jogo.';

  renderFatalError(root, message, () => {
    void bootstrap();
  });
}

void bootstrap().catch(showConnectionError);
