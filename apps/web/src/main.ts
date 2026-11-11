import Phaser from 'phaser';
import type { CharacterSummary, CombatSnapshot } from '@mundo-perfeito/shared';
import { ApiError, api } from './api';
import { sfxClick, sfxInventory, startMusic, stopMusic } from './audio';
import {
  clearAuthSession,
  clearStoredCharacterId,
  getAuthToken,
  getLegacyPlayerId,
  getPlayerId,
  getStoredCharacterId,
  setAuthSession,
  storeCharacterId
} from './player';
import { CityScene } from './scenes/CityScene';
import { WorldScene } from './scenes/WorldScene';
import { FarmScene } from './scenes/FarmScene';
import { renderAuthScreen } from './ui/auth';
import { renderCharacterCreator } from './ui/creator';
import { createGameHud, type GameHud } from './ui/hud';
import { renderFatalError, renderLoading } from './ui/screens';
import { renderCharacterSelector } from './ui/selector';
import { renderCharacterPanel } from './ui/character-panel';
import { renderInventoryPanel } from './ui/inventory-panel';
import { renderBlacksmithShop } from './ui/blacksmith-panel';
import { renderFarmShop } from './ui/farm-shop-panel';
import { renderSkillPanel } from './ui/skill-panel';
import { closeStageMap, openStageMap } from './ui/stage-map';
import './style.css';
import './city-multiplayer.css';

const MAX_CHARACTERS = 1;
const uiRoot = document.getElementById('ui-root');
if (!uiRoot) throw new Error('Elemento #ui-root não encontrado no index.html');
const root = uiRoot as HTMLElement;

let playerId = '';
let game: Phaser.Game | null = null;
let hud: GameHud | null = null;

function showAuthentication(): void {
  game?.destroy(true);
  game = null;
  hud?.destroy();
  hud = null;
  closeStageMap();
  stopMusic();
  renderAuthScreen(root, async (mode, email, password) => {
    const session = mode === 'register'
      ? await api.register(email, password, getLegacyPlayerId())
      : await api.login(email, password);
    setAuthSession(session.token, session.account.id);
    await bootstrap();
  });
}

async function bootstrap(): Promise<void> {
  if (!getAuthToken()) {
    showAuthentication();
    return;
  }
  renderLoading(root, 'Validando sua conta…');
  try {
    const session = await api.me();
    playerId = session.account.id;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearAuthSession();
      showAuthentication();
      return;
    }
    showConnectionError(error);
    return;
  }

  renderLoading(root, 'Conectando ao servidor…');
  const storedCharacterId = getStoredCharacterId();
  if (storedCharacterId) {
    try {
      const character = await api.getCharacter(storedCharacterId, playerId);
      startGame(character);
      return;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) clearStoredCharacterId();
      else {
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
      onCreate: () => void showCharacterCreator(true)
    });
  } catch (error) {
    showConnectionError(error);
  }
}

async function showCharacterCreator(canGoBack: boolean): Promise<void> {
  renderLoading(root, 'Preparando criação do personagem…');
  try {
    renderCharacterCreator(root, {
      onCreate: async ({ name, gender, professionId }) => {
        const character = await api.createCharacter({ name, gender, professionId });
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
    onSwitch: openCharacterSelector,
    onCharacter: () => void openCharacterPanel(character.id),
    onInventory: () => void openInventoryPanel(character.id),
    onTown: () => {
      if (!game) return;
      game.scene.stop('WorldScene');
      game.scene.stop('FarmScene');
      game.scene.start('CityScene');
      sfxClick();
    },
    onFarm: () => {
      if (!game) return;
      game.scene.stop('CityScene');
      game.scene.stop('WorldScene');
      game.scene.start('FarmScene');
      sfxClick();
    },
    onMap: openWorldMap,
    onSkills: () => void openSkillPanel(character.id),
    onCastSkill: (skillId) => void castSkill(character.id, skillId),
    onUsePotion: (itemId) => void useQuickPotion(character.id, itemId)
  });
  const logout = document.createElement('button');
  logout.className = 'account-logout';
  logout.type = 'button';
  logout.textContent = 'Sair';
  logout.addEventListener('click', () => {
    clearAuthSession();
    game?.destroy(true);
    game = null;
    hud?.destroy();
    hud = null;
    closeStageMap();
    stopMusic();
    void bootstrap();
  });
  root.append(logout);

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
    scene: [CityScene, WorldScene, FarmScene],
    render: { pixelArt: false, antialias: true, roundPixels: false },
    callbacks: {
      preBoot: (instance) => {
        instance.registry.set('character', character);
        instance.registry.set('playerId', playerId);
        instance.registry.set('hud', hud);
        instance.registry.set('openBlacksmithShop', () => void openBlacksmithShop(character.id));
        instance.registry.set('openFarmShop', () => void openFarmShop(character.id));
      }
    }
  };
  game = new Phaser.Game(config);
  startMusic();
}

function openWorldMap(): void {
  const current = (game?.registry.get('character') as CharacterSummary | undefined);
  if (!current) return;
  openStageMap({
    character: current,
    currentStageId: current.currentStageId,
    onTravel: enterWorld
  });
}

function enterWorld(snapshot: CombatSnapshot): void {
  if (!game) return;
  game.registry.set('character', snapshot.character);
  game.registry.set('travelSnapshot', snapshot);
  game.scene.stop('CityScene');
  game.scene.stop('FarmScene');
  game.scene.start('WorldScene');
  sfxClick();
}


async function openCharacterPanel(characterId: string): Promise<void> {
  closeGamePanel();
  sfxInventory();
  try {
    const character = await api.getCharacter(characterId);
    renderCharacterPanel(root, character, async (allocation) => {
      return api.allocateAttributes(characterId, allocation);
    }, closeGamePanel);
  } catch (error) {
    hud?.pushFeed(error instanceof Error ? error.message : 'Não foi possível carregar a ficha.', 'danger');
  }
}

async function openSkillPanel(characterId: string): Promise<void> {
  closeGamePanel();
  sfxInventory();
  try {
    const snapshot = await api.getCombat(characterId);
    renderSkillPanel(root, snapshot, async (skillId) => {
      const updated = await api.upgradeSkill(characterId, skillId);
      hud?.update(updated);
      return updated;
    }, closeGamePanel);
  } catch (error) {
    hud?.pushFeed(error instanceof Error ? error.message : 'Não foi possível carregar as habilidades.', 'danger');
  }
}

async function castSkill(characterId: string, skillId: string): Promise<void> {
  try {
    const snapshot = await api.castSkill(characterId, skillId);
    hud?.update(snapshot);
    game?.events.emit('skill-cast', snapshot);
  } catch (error) {
    hud?.pushFeed(error instanceof Error ? error.message : 'Não foi possível usar a habilidade.', 'danger');
  }
}

async function useQuickPotion(characterId: string, itemId: string): Promise<void> {
  try {
    const inventory = await api.getInventory(characterId);
    const potion = inventory.items.find((item) => item.itemId === itemId && item.quantity > 0);
    if (!potion) {
      hud?.pushFeed(itemId === 'mp-potion' ? 'Você não possui Poção de Mana.' : 'Você não possui Poção de Vida.', 'danger');
      return;
    }
    await api.useItem(characterId, potion.id);
    const snapshot = await api.getCombat(characterId);
    hud?.update(snapshot);
    game?.events.emit('skill-cast', snapshot);
    hud?.pushFeed(itemId === 'mp-potion' ? 'Poção de Mana utilizada.' : 'Poção de Vida utilizada.', 'gold');
  } catch (error) {
    hud?.pushFeed(error instanceof Error ? error.message : 'Não foi possível usar a poção.', 'danger');
  }
}

async function openBlacksmithShop(characterId: string): Promise<void> {
  closeGamePanel();
  sfxInventory();
  try {
    const inventory = await api.getInventory(characterId);
    renderBlacksmithShop(root, inventory, async (itemId, quantity) => {
      const updated = await api.sellItem(characterId, itemId, quantity);
      hud?.setGold(updated.gold);
      hud?.pushFeed(`Venda concluída: +${(updated.goldReceived ?? 0).toLocaleString('pt-BR')} ouro.`, 'gold');
      return updated;
    }, closeGamePanel);
  } catch (error) {
    hud?.pushFeed(error instanceof Error ? error.message : 'Não foi possível abrir o comércio do ferreiro.', 'danger');
  }
}

async function openFarmShop(characterId: string): Promise<void> {
  closeGamePanel();
  sfxClick();
  try {
    const farmData = await api.getFarm(characterId);
    renderFarmShop(
      root,
      farmData,
      async (buildingId) => {
        const updated = await api.buyFarmBuilding(characterId, buildingId);
        hud?.setGold(updated.gold);
        hud?.pushFeed(updated.message ?? 'Construção concluída na fazenda!', 'gold');
        return updated;
      },
      async (animalId) => {
        const updated = await api.buyFarmAnimal(characterId, animalId);
        hud?.setGold(updated.gold);
        hud?.pushFeed(updated.message ?? 'Animal adquirido!', 'gold');
        return updated;
      },
      async (cropId, quantity) => {
        const updated = await api.buyFarmSeeds(characterId, cropId, quantity);
        hud?.setGold(updated.gold);
        hud?.pushFeed(updated.message ?? 'Sementes compradas!', 'gold');
        return updated;
      },
      async (species, quantity) => {
        const updated = await api.craftFarmFeed(characterId, species, quantity);
        hud?.pushFeed(updated.message ?? 'Ração preparada!', 'gold');
        return updated;
      },
      async (buildingId, kind, quantity) => {
        const updated = await api.fillFarmTrough(characterId, buildingId, kind, quantity);
        hud?.pushFeed(updated.message ?? 'Comedouro ou bebedouro abastecido!', 'gold');
        return updated;
      },
      () => {
        if (!game) return;
        game.scene.stop('CityScene');
        game.scene.stop('WorldScene');
        game.scene.start('FarmScene');
        sfxClick();
      },
      closeGamePanel
    );
  } catch (error) {
    hud?.pushFeed(error instanceof Error ? error.message : 'Não foi possível abrir o comércio agropecuário.', 'danger');
  }
}

async function openInventoryPanel(characterId: string): Promise<void> {
  closeGamePanel();
  sfxInventory();
  try {
    const inventory = await api.getInventory(characterId);
    renderInventoryPanel(
      root,
      inventory,
      (itemId) => api.equipItem(characterId, itemId),
      (slot) => api.unequipItem(characterId, slot),
      (itemId) => api.useItem(characterId, itemId),
      async (itemKey) => {
        const updated = await api.sellFarmItem(characterId, itemKey);
        hud?.setGold(updated.gold);
        hud?.pushFeed('Produto vendido: +1.000 ouro.', 'gold');
        return updated;
      },
      closeGamePanel
    );
  } catch (error) {
    hud?.pushFeed(error instanceof Error ? error.message : 'Não foi possível carregar o inventário.', 'danger');
  }
}

function closeGamePanel(): void {
  root.querySelector('.game-panel-overlay')?.remove();
}

function openCharacterSelector(): void {
  game?.destroy(true);
  game = null;
  hud?.destroy();
  hud = null;
  closeStageMap();
  stopMusic();
  void showCharacterSelector();
}

function showConnectionError(error: unknown): void {
  const message = error instanceof Error ? error.message : 'Não foi possível conectar ao servidor do jogo.';
  renderFatalError(root, message, () => void bootstrap());
}

void bootstrap().catch(showConnectionError);
