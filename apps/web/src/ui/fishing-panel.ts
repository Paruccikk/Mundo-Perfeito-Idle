import type { FarmFishingState, FarmResponse, FishCatchResult, FishRankDefinition } from '@mundo-perfeito/shared';
import { FISH_CATALOG, FISH_ORDER, FISH_RANKS, fishRankForScore } from '@mundo-perfeito/shared';
import { api } from '../api';
import { fishIllustrationSvg } from './fish-art';

const CAST_DURATION_MS = 3200;

const ANGLER_TIERS = [
  { label: 'Novato do Lago', min: 0 },
  { label: 'Aprendiz de Pesca', min: 60 },
  { label: 'Pescador do Vale', min: 140 },
  { label: 'Veterano das Águas', min: 220 },
  { label: 'Mestre da Vara', min: 300 },
  { label: 'Lenda do Lago', min: 360 }
] as const;

export interface FishingPanelOptions {
  characterId: string;
  onCatch?: (response: FarmResponse) => void;
  onClose?: () => void;
}

function formatWeight(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatLength(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function rankBadge(rank: FishRankDefinition, extraClass = ''): string {
  return `<span class="fishing-rank-badge fishing-rank-badge--${rank.id}${extraClass ? ` ${extraClass}` : ''}">
    <span class="fishing-rank-badge__stars">${'★'.repeat(rank.stars)}${'☆'.repeat(5 - rank.stars)}</span>
    ${rank.label}
  </span>`;
}

function emptyFishingState(): FarmFishingState {
  return { records: {}, totalCaught: 0 };
}

function lakeScene(): string {
  return `<svg class="fishing-stage__scene" viewBox="0 0 420 230" role="img" aria-label="Pôr do sol no Lago de Valedouro" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fishing-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#173a43" />
        <stop offset="0.55" stop-color="#3b6a6d" />
        <stop offset="1" stop-color="#d8a66a" />
      </linearGradient>
      <linearGradient id="fishing-water" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#4c8f9a" />
        <stop offset="0.45" stop-color="#2f6f7c" />
        <stop offset="1" stop-color="#173f4a" />
      </linearGradient>
      <radialGradient id="fishing-sun">
        <stop offset="0" stop-color="#fff4c7" />
        <stop offset="0.55" stop-color="#ffd984" />
        <stop offset="1" stop-color="#f2ae55" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="fishing-hill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#244a45" />
        <stop offset="1" stop-color="#183530" />
      </linearGradient>
    </defs>
    <rect width="420" height="126" fill="url(#fishing-sky)" />
    <circle cx="326" cy="58" r="42" fill="url(#fishing-sun)" />
    <circle cx="326" cy="58" r="19" fill="#ffe7a1" opacity="0.9" />
    <path d="M0 116 C60 80 116 96 162 100 C216 66 282 86 330 98 C370 86 398 92 420 104 L420 132 L0 132 Z" fill="url(#fishing-hill)" opacity="0.85" />
    <rect y="118" width="420" height="112" fill="url(#fishing-water)" />
    <g fill="none" stroke="#a7d5cf" stroke-linecap="round">
      <path d="M30 152 H86" opacity="0.35" stroke-width="2" />
      <path d="M210 176 H268" opacity="0.3" stroke-width="2" />
      <path d="M306 196 H362" opacity="0.24" stroke-width="2" />
      <path d="M96 210 H148" opacity="0.18" stroke-width="2" />
    </g>
    <g class="fishing-stage__ripples" fill="none" stroke="#bfe7df" stroke-width="2">
      <ellipse class="fishing-stage__ripple fishing-stage__ripple--one" cx="300" cy="151" rx="24" ry="6" />
      <ellipse class="fishing-stage__ripple fishing-stage__ripple--two" cx="300" cy="151" rx="36" ry="9" />
    </g>
    <g class="fishing-stage__angler">
      <ellipse cx="74" cy="162" rx="30" ry="8" fill="#0b2226" opacity="0.45" />
      <path d="M38 156 L124 150 L128 160 L34 166 Z" fill="#6b4a2d" />
      <path d="M38 156 L124 150 L126 154 L36 160 Z" fill="#9b6d42" opacity="0.75" />
      <path d="M54 150 C54 121 62 108 76 108 C90 108 97 123 96 150 Z" fill="#19353a" />
      <path d="M58 143 C61 123 69 115 77 115 C85 115 92 126 93 143 Z" fill="#2f5557" />
      <circle cx="78" cy="98" r="11" fill="#d8ab79" />
      <path d="M65 97 C66 84 92 82 93 96 C90 92 80 89 65 97 Z" fill="#2e4c47" />
      <path d="M64 96 C78 91 91 93 96 99 L97 103 C84 97 72 98 65 101 Z" fill="#40665d" />
      <path d="M74 109 C73 121 72 132 73 141" fill="none" stroke="#d8ab79" stroke-width="5" stroke-linecap="round" />
      <path d="M86 112 C98 103 108 90 116 77" fill="none" stroke="#c9a36f" stroke-width="3" stroke-linecap="round" />
      <path d="M87 112 C102 104 114 92 124 82" fill="none" stroke="#e6c48d" stroke-width="1.4" stroke-linecap="round" opacity="0.75" />
      <path d="M54 124 C42 129 34 138 33 149" fill="none" stroke="#d8ab79" stroke-width="5" stroke-linecap="round" />
      <path d="M33 149 L24 158" fill="none" stroke="#d8ab79" stroke-width="4" stroke-linecap="round" />
    </g>
    <g class="fishing-stage__bobber-group">
      <path d="M122 82 C184 92 250 120 300 145" fill="none" stroke="#d9d2b3" stroke-width="1.2" opacity="0.75" />
      <ellipse cx="300" cy="151" rx="9" ry="3.5" fill="#0c2930" opacity="0.4" />
      <circle cx="300" cy="145" r="7" fill="#f4eee0" />
      <path d="M293 145 A7 7 0 0 1 307 145 Z" fill="#c95543" />
      <path d="M300 138 L300 131" fill="none" stroke="#e6c48d" stroke-width="2" />
      <circle cx="300" cy="145" r="7" fill="none" stroke="#263c3e" stroke-width="1" opacity="0.5" />
    </g>
    <g fill="#0d272c" opacity="0.6">
      <path d="M176 54 q5 -5 10 0 q5 -5 10 0" fill="none" stroke="#0d272c" stroke-width="2.2" stroke-linecap="round" />
      <path d="M206 42 q4 -4 8 0 q4 -4 8 0" fill="none" stroke="#0d272c" stroke-width="1.8" stroke-linecap="round" />
    </g>
  </svg>`;
}

export class FishingPanel {
  private readonly overlay: HTMLDivElement;
  private readonly stage: HTMLElement;
  private readonly status: HTMLElement;
  private readonly castButton: HTMLButtonElement;
  private readonly progress: HTMLElement;
  private readonly progressFill: HTMLElement;
  private readonly catchCard: HTMLElement;
  private readonly rankList: HTMLOListElement;
  private readonly rankTier: HTMLElement;
  private readonly rankCaught: HTMLElement;
  private readonly rankScore: HTMLElement;
  private readonly rankProgress: HTMLElement;
  private readonly rankNext: HTMLElement;
  private readonly options: FishingPanelOptions;

  private fishing: FarmFishingState = emptyFishingState();
  private casting = false;
  private destroyed = false;
  private caughtSinceOpen = false;
  private animationFrame = 0;

  constructor(root: HTMLElement, options: FishingPanelOptions) {
    this.options = options;
    this.overlay = document.createElement('div');
    this.overlay.className = 'fishing-overlay';
    this.overlay.innerHTML = `
      <section class="fishing-panel" role="dialog" aria-modal="true" aria-labelledby="fishing-panel-title">
        <header class="fishing-panel__header">
          <div class="fishing-panel__heading">
            <span class="fishing-panel__eyebrow">Lago de Valedouro · Pesca pública</span>
            <h2 class="fishing-panel__title" id="fishing-panel-title">Diário de Pesca</h2>
            <p class="fishing-panel__intro">Lance a vara, espere a boia afundar e registre o tamanho da sua sorte.</p>
          </div>
          <div class="fishing-panel__header-side">
            <span class="fishing-panel__weather">☀ Entardecer no lago</span>
            <button type="button" class="fishing-panel__close" aria-label="Fechar o diário de pesca">×</button>
          </div>
        </header>
        <div class="fishing-panel__body">
          <section class="fishing-stage" aria-label="Área de pesca do lago">
            <div class="fishing-stage__lake">
              ${lakeScene()}
              <p class="fishing-stage__status">O lago está calmo. Quando quiser, arremesse a linha.</p>
            </div>
            <div class="fishing-stage__actions">
              <button type="button" class="fishing-cast">🎣 Lançar a vara <span class="fishing-cast__time">3 s</span></button>
              <div class="fishing-stage__progress" hidden><span></span></div>
            </div>
            <div class="fishing-catch" hidden role="status" aria-live="polite"></div>
          </section>
          <aside class="fishing-rank" aria-label="Rank de pesca">
            <header class="fishing-rank__head">
              <span class="fishing-rank__eyebrow">Rank pessoal</span>
              <h3 class="fishing-rank__title">Seus recordes</h3>
              <p class="fishing-rank__subtitle">Peso e tamanho são registrados por espécie.</p>
            </header>
            <div class="fishing-rank__summary">
              <span class="fishing-rank__medal" aria-hidden="true">🎣</span>
              <div class="fishing-rank__summary-text">
                <strong class="fishing-rank__tier">Novato do Lago</strong>
                <span class="fishing-rank__caught">0 peixes fisgados</span>
              </div>
              <span class="fishing-rank__score">0/400</span>
            </div>
            <div class="fishing-rank__progress"><span></span></div>
            <p class="fishing-rank__next">Pesque para começar seu ranking.</p>
            <ol class="fishing-rank__list">
              <li class="fishing-record is-loading">Consultando seus recordes...</li>
            </ol>
            <p class="fishing-rank__hint">Os peixes ficam no inventário e podem ser vendidos no comércio da cidade.</p>
          </aside>
        </div>
        <footer class="fishing-panel__footer">
          <span class="fishing-panel__footer-hint">A linha leva alguns segundos para fisgar. Paciência é parte da pesca.</span>
          <button type="button" class="fishing-panel__back">Voltar à cidade</button>
        </footer>
      </section>`;

    root.append(this.overlay);

    const required = <T extends Element>(selector: string): T => {
      const element = this.overlay.querySelector<T>(selector);
      if (!element) throw new Error(`Elemento da pesca não encontrado: ${selector}`);
      return element;
    };

    this.stage = required<HTMLElement>('.fishing-stage');
    this.status = required<HTMLElement>('.fishing-stage__status');
    this.castButton = required<HTMLButtonElement>('.fishing-cast');
    this.progress = required<HTMLElement>('.fishing-stage__progress');
    this.progressFill = required<HTMLElement>('.fishing-stage__progress span');
    this.catchCard = required<HTMLElement>('.fishing-catch');
    this.rankList = required<HTMLOListElement>('.fishing-rank__list');
    this.rankTier = required<HTMLElement>('.fishing-rank__tier');
    this.rankCaught = required<HTMLElement>('.fishing-rank__caught');
    this.rankScore = required<HTMLElement>('.fishing-rank__score');
    this.rankProgress = required<HTMLElement>('.fishing-rank__progress span');
    this.rankNext = required<HTMLElement>('.fishing-rank__next');

    this.castButton.addEventListener('click', () => this.startCast());
    this.overlay.querySelectorAll<HTMLButtonElement>('.fishing-panel__close, .fishing-panel__back')
      .forEach((button) => button.addEventListener('click', () => this.close()));
    this.overlay.addEventListener('pointerdown', (event) => {
      if (event.target === this.overlay) this.close();
    });
    document.addEventListener('keydown', this.handleKeydown);

    window.requestAnimationFrame(() => {
      if (!this.destroyed) this.castButton.focus({ preventScroll: true });
    });
    void this.loadRecords();
  }

  close(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.casting = false;
    if (this.animationFrame) window.cancelAnimationFrame(this.animationFrame);
    document.removeEventListener('keydown', this.handleKeydown);
    this.overlay.remove();
    this.options.onClose?.();
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.close();
  };

  private async loadRecords(): Promise<void> {
    try {
      const response = await api.getFarm(this.options.characterId);
      if (this.destroyed || this.caughtSinceOpen) return;
      this.fishing = response.farm.fishing ?? emptyFishingState();
      this.renderRank();
    } catch {
      if (this.destroyed) return;
      this.rankList.innerHTML = '<li class="fishing-record is-empty">Não foi possível carregar os recordes agora.</li>';
    }
  }

  private startCast(): void {
    if (this.casting || this.destroyed) return;
    this.casting = true;
    this.castButton.disabled = true;
    this.castButton.innerHTML = '<span class="fishing-cast__spinner" aria-hidden="true"></span> Pescando...';
    this.stage.classList.remove('has-catch');
    this.stage.classList.add('is-casting');
    this.catchCard.hidden = true;
    this.catchCard.classList.remove('is-visible');
    this.progress.hidden = false;
    this.progressFill.style.width = '0%';
    this.status.textContent = 'Lançando a vara...';

    const startedAt = performance.now();
    const tick = (now: number): void => {
      if (!this.casting || this.destroyed) return;
      const elapsed = now - startedAt;
      const percent = Math.min(1, elapsed / CAST_DURATION_MS);
      this.progressFill.style.width = `${Math.round(percent * 100)}%`;
      if (elapsed < CAST_DURATION_MS * 0.38) {
        this.status.textContent = 'Lançando a vara...';
      } else if (elapsed < CAST_DURATION_MS * 0.82) {
        this.status.textContent = 'Esperando o peixe morder...';
      } else {
        this.status.textContent = 'Recolhendo a linha...';
      }
      if (percent < 1) {
        this.animationFrame = window.requestAnimationFrame(tick);
      } else {
        void this.finishCast();
      }
    };
    this.animationFrame = window.requestAnimationFrame(tick);
  }

  private async finishCast(): Promise<void> {
    this.status.textContent = 'Fisgando...';
    try {
      const response = await api.fishAtCity(this.options.characterId);
      if (this.destroyed) return;
      const catchResult = response.catch;
      this.fishing = response.farm.fishing ?? this.fishing;
      this.caughtSinceOpen = true;
      this.renderRank();

      if (!catchResult) {
        this.status.textContent = response.message ?? 'Você fisgou alguma coisa!';
      } else {
        this.showCatch(response, catchResult);
      }
      this.resetCastButton(catchResult ? '🎣 Pescar novamente' : '🎣 Lançar a vara');
      this.options.onCatch?.(response);
    } catch (error) {
      if (this.destroyed) return;
      this.status.textContent = error instanceof Error
        ? error.message
        : 'Não foi possível pescar agora. Tente novamente.';
      this.resetCastButton('🎣 Tentar novamente');
    }
  }

  private resetCastButton(label: string): void {
    this.casting = false;
    this.stage.classList.remove('is-casting');
    this.progress.hidden = true;
    this.castButton.disabled = false;
    this.castButton.innerHTML = `${label} <span class="fishing-cast__time">3 s</span>`;
  }

  private showCatch(response: FarmResponse, catchResult: FishCatchResult): void {
    const definition = FISH_CATALOG[catchResult.fishId];
    const rank = FISH_RANKS.find((item) => item.id === catchResult.rank) ?? fishRankForScore(catchResult.score);
    const recordLabels: string[] = [];
    if (catchResult.isWeightRecord) recordLabels.push('peso');
    if (catchResult.isLengthRecord) recordLabels.push('tamanho');
    const recordText = catchResult.isRecord
      ? `🏆 Novo recorde de ${recordLabels.join(' e ')}!`
      : `Seu recorde: ${formatWeight(catchResult.record.bestWeightKg)} kg · ${formatLength(catchResult.record.bestLengthCm)} cm`;
    const totalCaught = this.fishing.totalCaught || catchResult.totalCaught;

    this.catchCard.innerHTML = `
      <div class="fishing-catch__frame">
        <span class="fishing-catch__eyebrow">Captura registrada</span>
        <h3 class="fishing-catch__name">${definition.name}</h3>
        <div class="fishing-catch__art">${fishIllustrationSvg(catchResult.fishId)}</div>
        ${rankBadge(rank, 'fishing-catch__badge')}
        <div class="fishing-catch__stats">
          <div class="fishing-catch__stat">
            <span>Peso</span>
            <strong>${formatWeight(catchResult.weightKg)}</strong>
            <small>kg</small>
          </div>
          <div class="fishing-catch__stat">
            <span>Tamanho</span>
            <strong>${formatLength(catchResult.lengthCm)}</strong>
            <small>cm</small>
          </div>
          <div class="fishing-catch__stat">
            <span>Pontuação</span>
            <strong>${catchResult.score}</strong>
            <small>/100</small>
          </div>
        </div>
        <p class="fishing-catch__record${catchResult.isRecord ? '' : ' fishing-catch__record--quiet'}">${recordText}</p>
        <p class="fishing-catch__description">${definition.description}</p>
        <p class="fishing-catch__stored">Guardado no inventário · ${totalCaught} peixe(s) fisgado(s)</p>
      </div>`;
    this.catchCard.hidden = false;
    this.stage.classList.add('has-catch');
    this.status.textContent = response.message ?? `Você pescou ${definition.name}!`;
    window.requestAnimationFrame(() => {
      this.catchCard.classList.add('is-visible');
      // Garante que a ficha do peixe apareça inteira, mesmo no desktop.
      window.requestAnimationFrame(() => {
        this.catchCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  }

  private renderRank(): void {
    const records = this.fishing.records;
    const totalScore = FISH_ORDER.reduce((sum, id) => sum + (records[id]?.bestScore ?? 0), 0);
    const tierIndex = ANGLER_TIERS.reduce((current, tier, index) => totalScore >= tier.min ? index : current, 0);
    const tier = ANGLER_TIERS[tierIndex] ?? ANGLER_TIERS[0];
    const nextTier = ANGLER_TIERS[tierIndex + 1];
    const tierSpan = nextTier ? nextTier.min - tier.min : 1;
    const progress = nextTier
      ? Math.min(1, Math.max(0, (totalScore - tier.min) / tierSpan))
      : 1;

    this.rankTier.textContent = tier.label;
    this.rankCaught.textContent = `${this.fishing.totalCaught} peixe(s) fisgado(s)`;
    this.rankScore.textContent = `${totalScore}/400`;
    this.rankProgress.style.width = `${Math.round(progress * 100)}%`;
    this.rankNext.textContent = nextTier
      ? `Faltam ${Math.max(0, nextTier.min - totalScore)} ponto(s) para ${nextTier.label}.`
      : 'Você alcançou o topo do lago.';

    const entries = FISH_ORDER.map((id) => ({ id, record: records[id] }))
      .sort((a, b) => (b.record?.bestScore ?? -1) - (a.record?.bestScore ?? -1));

    this.rankList.innerHTML = entries.map(({ id, record }, index) => {
      const definition = FISH_CATALOG[id];
      const rank = record ? FISH_RANKS.find((item) => item.id === record.bestRank) ?? fishRankForScore(record.bestScore) : null;
      return `<li class="fishing-record${record ? '' : ' is-empty'}">
        <span class="fishing-record__position">${index + 1}º</span>
        <span class="fishing-record__art" aria-hidden="true">${fishIllustrationSvg(id)}</span>
        <div class="fishing-record__info">
          <strong>${definition.name}</strong>
          <small>${record
            ? `${formatWeight(record.bestWeightKg)} kg · ${formatLength(record.bestLengthCm)} cm`
            : 'Ainda não fisgado'}</small>
        </div>
        ${rank ? rankBadge(rank, 'fishing-record__badge') : '<span class="fishing-record__none">—</span>'}
      </li>`;
    }).join('');
  }
}
