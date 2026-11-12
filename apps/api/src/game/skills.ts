import type { CharacterClassId } from './types.js';

export type SkillEffect = 'damage' | 'heal' | 'group_heal';

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  effect: SkillEffect;
  multiplier: number;
  manaCost: number;
  cooldownSeconds: number;
  requiredLevel: number;
  maxLevel: number;
  special?: boolean;
}

const definitions: Record<CharacterClassId, SkillDefinition[]> = {
  mage: [
    { id: 'mage-fireball', name: 'Bola de Fogo', description: 'Dispara uma esfera flamejante que amplifica o próximo ataque mágico.', effect: 'damage', multiplier: 1.8, manaCost: 12, cooldownSeconds: 5, requiredLevel: 1, maxLevel: 5 },
    { id: 'mage-frostbolt', name: 'Lança de Gelo', description: 'Projétil congelante de alto dano mágico.', effect: 'damage', multiplier: 2.25, manaCost: 20, cooldownSeconds: 12, requiredLevel: 5, maxLevel: 5 },
    { id: 'mage-arcane-surge', name: 'Surto Arcano', description: 'Concentra energia para um ataque devastador.', effect: 'damage', multiplier: 3.6, manaCost: 38, cooldownSeconds: 60, requiredLevel: 20, maxLevel: 5, special: true }
  ],
  archer: [
    { id: 'archer-power-shot', name: 'Tiro Potente', description: 'Disparo preciso que aumenta o próximo ataque físico à distância.', effect: 'damage', multiplier: 1.9, manaCost: 8, cooldownSeconds: 5, requiredLevel: 1, maxLevel: 5 },
    { id: 'archer-multishot', name: 'Rajada de Flechas', description: 'Uma sequência de flechas concentradas no alvo.', effect: 'damage', multiplier: 2.3, manaCost: 16, cooldownSeconds: 12, requiredLevel: 5, maxLevel: 5 },
    { id: 'archer-deadeye', name: 'Olho da Águia', description: 'Disparo especial com precisão e dano elevados.', effect: 'damage', multiplier: 3.8, manaCost: 30, cooldownSeconds: 60, requiredLevel: 20, maxLevel: 5, special: true }
  ],
  warrior: [
    { id: 'warrior-shield-bash', name: 'Golpe de Escudo', description: 'Golpe corpo a corpo reforçado pela defesa.', effect: 'damage', multiplier: 1.8, manaCost: 8, cooldownSeconds: 5, requiredLevel: 1, maxLevel: 5 },
    { id: 'warrior-whirlwind', name: 'Redemoinho', description: 'Giro poderoso que aumenta o próximo golpe.', effect: 'damage', multiplier: 2.4, manaCost: 16, cooldownSeconds: 12, requiredLevel: 5, maxLevel: 5 },
    { id: 'warrior-avatar', name: 'Avatar de Batalha', description: 'Libera toda a força em um golpe especial.', effect: 'damage', multiplier: 3.8, manaCost: 28, cooldownSeconds: 60, requiredLevel: 20, maxLevel: 5, special: true }
  ],
  priest: [
    { id: 'priest-smite', name: 'Luz Sagrada', description: 'Projétil sagrado que fere o inimigo à distância.', effect: 'damage', multiplier: 1.7, manaCost: 9, cooldownSeconds: 5, requiredLevel: 1, maxLevel: 5 },
    { id: 'priest-heal', name: 'Cura', description: 'Restaura parte da vida do sacerdote.', effect: 'heal', multiplier: 0.22, manaCost: 16, cooldownSeconds: 10, requiredLevel: 5, maxLevel: 5 },
    { id: 'priest-group-heal', name: 'Cura em Grupo', description: 'Grande cura de área. Quando grupos forem habilitados, alcançará os aliados próximos.', effect: 'group_heal', multiplier: 0.38, manaCost: 40, cooldownSeconds: 90, requiredLevel: 20, maxLevel: 5, special: true }
  ]
};

export function skillsForClass(classId: CharacterClassId): SkillDefinition[] {
  return definitions[classId].map((skill) => ({ ...skill }));
}

export function findSkill(classId: CharacterClassId, skillId: string): SkillDefinition | undefined {
  return definitions[classId].find((skill) => skill.id === skillId);
}

export function skillLevelFor(levels: Record<string, number> | undefined, skillId: string): number {
  return Math.max(0, Math.min(5, Math.floor(levels?.[skillId] ?? 0)));
}
