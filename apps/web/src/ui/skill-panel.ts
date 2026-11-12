import type { CombatSnapshot, SkillSnapshot } from '@mundo-perfeito/shared';

export function renderSkillPanel(
  root: HTMLElement,
  snapshot: CombatSnapshot,
  onUpgrade: (skillId: string) => Promise<CombatSnapshot>,
  onClose: () => void
): void {
  root.querySelector('.game-panel-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'game-panel-overlay';
  const panel = document.createElement('section');
  panel.className = 'game-panel skill-panel';
  const header = document.createElement('header');
  header.className = 'game-panel__header';
  const heading = document.createElement('div');
  const eyebrow = document.createElement('p');
  eyebrow.className = 'game-panel__eyebrow';
  eyebrow.textContent = 'Progressão de classe';
  const title = document.createElement('h2');
  title.textContent = 'Árvore de habilidades';
  const subtitle = document.createElement('p');
  subtitle.className = 'game-panel__subtitle';
  subtitle.textContent = `${snapshot.character.className} · ${snapshot.combat.skillPoints} ponto(s) disponível(is)`;
  heading.append(eyebrow, title, subtitle);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'game-panel__close';
  close.textContent = '✕';
  close.addEventListener('click', onClose);
  header.append(heading, close);

  const tree = document.createElement('div');
  tree.className = 'skill-panel__tree';
  for (const skill of snapshot.combat.skills) {
    tree.append(buildSkillCard(skill, snapshot, onUpgrade, onClose));
  }
  panel.append(header, tree);
  overlay.append(panel);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) onClose(); });
  root.append(overlay);
}

function buildSkillCard(
  skill: SkillSnapshot,
  snapshot: CombatSnapshot,
  onUpgrade: (skillId: string) => Promise<CombatSnapshot>,
  onClose: () => void
): HTMLElement {
  const card = document.createElement('article');
  card.className = `skill-card${skill.special ? ' skill-card--special' : ''}`;
  const top = document.createElement('div');
  top.className = 'skill-card__top';
  const name = document.createElement('strong');
  name.textContent = skill.name;
  const rank = document.createElement('span');
  rank.textContent = skill.level > 0 ? `Nv. ${skill.level}/${skill.maxLevel}` : 'Bloqueada';
  top.append(name, rank);
  const description = document.createElement('p');
  description.textContent = skill.description;
  const meta = document.createElement('small');
  meta.textContent = `${skill.manaCost} MP · Recarga ${skill.cooldownSeconds}s · Requer nível ${skill.requiredLevel}`;
  const upgrade = document.createElement('button');
  upgrade.type = 'button';
  upgrade.className = 'ghost-button skill-card__upgrade';
  const canUpgrade = skill.level < skill.maxLevel && snapshot.character.level >= skill.requiredLevel && snapshot.combat.skillPoints > 0;
  upgrade.disabled = !canUpgrade;
  upgrade.textContent = skill.level >= skill.maxLevel ? 'Nível máximo' : skill.level === 0 ? 'Desbloquear · 1 ponto' : 'Evoluir · 1 ponto';
  upgrade.addEventListener('click', async () => {
    upgrade.disabled = true;
    upgrade.textContent = 'Evoluindo…';
    try {
      const next = await onUpgrade(skill.id);
      renderSkillPanel(document.getElementById('ui-root') as HTMLElement, next, onUpgrade, onClose);
    } catch (error) {
      upgrade.disabled = false;
      upgrade.textContent = error instanceof Error ? error.message : 'Não foi possível evoluir';
    }
  });
  card.append(top, description, meta, upgrade);
  return card;
}
