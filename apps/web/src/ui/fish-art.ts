import type { FishId } from '@mundo-perfeito/shared';

let artCounter = 0;

function wrap(content: string, className: string): string {
  return `<svg class="fish-art ${className}" viewBox="0 0 360 200" role="img" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
    ${content}
  </svg>`;
}

function lambari(uid: string): string {
  const scales = [
    [142, 92], [160, 84], [178, 82], [196, 82], [214, 84], [232, 88], [250, 92],
    [152, 112], [170, 116], [188, 118], [206, 118], [224, 114], [242, 108]
  ]
    .map(([x, y]) => `<path d="M${x} ${y} q8 9 0 18" />`)
    .join('');
  return wrap(
    `<defs>
      <linearGradient id="${uid}-body" x1="0" y1="0" x2="0.9" y2="1">
        <stop offset="0" stop-color="#f5fdfe" />
        <stop offset="0.42" stop-color="#c5dde2" />
        <stop offset="1" stop-color="#6f98a3" />
      </linearGradient>
      <linearGradient id="${uid}-fin" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#b9d6dc" />
        <stop offset="1" stop-color="#5b828d" />
      </linearGradient>
    </defs>
    <ellipse cx="190" cy="166" rx="116" ry="15" fill="#0a3036" opacity="0.18" />
    <g class="fish-art__fish">
      <path d="M86 100 L34 64 C50 87 50 113 34 136 Z" fill="url(#${uid}-fin)" stroke="#527b86" stroke-width="2" />
      <path d="M164 58 C178 34 210 34 226 55 Z" fill="#8fb4bd" stroke="#527b86" stroke-width="2" />
      <path d="M206 132 C214 152 236 156 246 142 Z" fill="#8fb4bd" stroke="#527b86" stroke-width="1.6" />
      <path d="M86 100 C104 66 148 52 205 54 C258 56 296 76 314 100 C296 124 258 144 205 146 C148 148 104 134 86 100 Z" fill="url(#${uid}-body)" stroke="#5e8893" stroke-width="2.4" />
      <path d="M116 120 C146 136 196 140 244 132 C220 145 166 148 126 136 Z" fill="#e9f4f5" opacity="0.48" />
      <path d="M112 101 C162 89 232 89 288 99" fill="none" stroke="#f7ffff" stroke-width="3" opacity="0.45" />
      <path d="M112 103 C162 94 232 94 286 102" fill="none" stroke="#567f8a" stroke-width="2.2" opacity="0.55" />
      <g fill="none" stroke="#5c8792" stroke-width="1.2" opacity="0.5">${scales}</g>
      <path d="M254 78 C246 90 246 110 254 122" fill="none" stroke="#5a828c" stroke-width="2" opacity="0.65" />
      <path d="M306 98 C298 101 296 106 300 111" fill="none" stroke="#456d77" stroke-width="2.2" stroke-linecap="round" />
      <circle cx="282" cy="92" r="9" fill="#f7ffff" stroke="#506f78" stroke-width="1.5" />
      <circle cx="284" cy="93" r="4.5" fill="#1c2f35" />
      <circle cx="282.5" cy="90.5" r="1.6" fill="#ffffff" />
      <ellipse cx="216" cy="74" rx="36" ry="10" fill="#ffffff" opacity="0.32" transform="rotate(-8 216 74)" />
    </g>
    <g fill="none" stroke="#b9e8ee" stroke-width="2" opacity="0.7">
      <circle cx="68" cy="50" r="4" />
      <circle cx="52" cy="36" r="2.6" />
      <circle cx="82" cy="32" r="1.8" />
    </g>`,
    'fish-art--lambari'
  );
}

function trout(uid: string): string {
  const spots = [
    [144, 72, 3.2], [168, 64, 2.6], [191, 62, 3.4], [216, 64, 2.4], [239, 70, 3],
    [156, 88, 2.2], [203, 78, 2.8], [228, 82, 2.2], [256, 84, 2.6],
    [150, 116, 2.4], [180, 126, 2.6], [210, 130, 2.2], [238, 122, 2.8]
  ]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" />`)
    .join('');
  return wrap(
    `<defs>
      <linearGradient id="${uid}-body" x1="0" y1="0" x2="0.85" y2="1">
        <stop offset="0" stop-color="#f4e4bd" />
        <stop offset="0.4" stop-color="#c5a26b" />
        <stop offset="1" stop-color="#7c5b39" />
      </linearGradient>
      <linearGradient id="${uid}-fin" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#c9a970" />
        <stop offset="1" stop-color="#7a5735" />
      </linearGradient>
    </defs>
    <ellipse cx="190" cy="166" rx="120" ry="15" fill="#0a3036" opacity="0.18" />
    <g class="fish-art__fish">
      <path d="M82 100 L28 68 C44 89 44 111 28 132 Z" fill="url(#${uid}-fin)" stroke="#65482e" stroke-width="2" />
      <path d="M160 58 C174 32 208 34 224 56 Z" fill="#a17b4b" stroke="#65482e" stroke-width="2" />
      <path d="M224 126 C232 146 252 150 260 138 Z" fill="#a17b4b" stroke="#65482e" stroke-width="1.6" />
      <path d="M82 100 C102 66 148 50 208 52 C262 54 298 76 316 100 C298 124 262 146 208 148 C148 150 102 134 82 100 Z" fill="url(#${uid}-body)" stroke="#65482e" stroke-width="2.4" />
      <path d="M112 120 C144 138 198 142 250 132 C224 146 164 150 120 136 Z" fill="#f6e8c9" opacity="0.58" />
      <path d="M104 108 C164 94 238 94 306 106" fill="none" stroke="#e3807c" stroke-width="8" opacity="0.72" />
      <path d="M104 108 C164 94 238 94 306 106" fill="none" stroke="#ffd1c9" stroke-width="2.2" opacity="0.7" />
      <g fill="#503823" opacity="0.72">${spots}</g>
      <path d="M256 78 C248 90 248 110 256 122" fill="none" stroke="#6a4b2f" stroke-width="2" opacity="0.6" />
      <path d="M306 98 C298 101 296 106 300 111" fill="none" stroke="#4b321e" stroke-width="2.4" stroke-linecap="round" />
      <circle cx="284" cy="92" r="9" fill="#f9edcf" stroke="#5a3f27" stroke-width="1.5" />
      <circle cx="286" cy="93" r="4.5" fill="#1e1710" />
      <circle cx="284.5" cy="90.5" r="1.6" fill="#ffffff" />
      <path d="M212 66 C230 62 252 68 264 82" fill="none" stroke="#f7e7bc" stroke-width="2" opacity="0.45" />
      <path d="M148 62 C156 54 170 50 182 52" fill="none" stroke="#f7e7bc" stroke-width="2" opacity="0.35" />
    </g>`,
    'fish-art--trout'
  );
}

function carp(uid: string): string {
  const scales = [
    [136, 84, 15], [162, 76, 16], [190, 72, 17], [218, 76, 16], [244, 82, 15],
    [148, 116, 15], [176, 122, 16], [204, 122, 16], [232, 116, 15], [257, 106, 14]
  ]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" />`)
    .join('');
  return wrap(
    `<defs>
      <linearGradient id="${uid}-body" x1="0" y1="0" x2="0.9" y2="1">
        <stop offset="0" stop-color="#ffe6ab" />
        <stop offset="0.45" stop-color="#e9a94c" />
        <stop offset="1" stop-color="#a95f25" />
      </linearGradient>
      <linearGradient id="${uid}-fin" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f6c978" />
        <stop offset="1" stop-color="#b86a2c" />
      </linearGradient>
    </defs>
    <ellipse cx="192" cy="166" rx="124" ry="16" fill="#0a3036" opacity="0.18" />
    <g class="fish-art__fish">
      <path d="M92 100 L32 58 C54 87 54 113 32 142 Z" fill="url(#${uid}-fin)" stroke="#7d451e" stroke-width="2" />
      <path d="M148 54 C166 26 220 26 250 52 L242 62 C216 42 178 42 156 64 Z" fill="#d58a3b" stroke="#7d451e" stroke-width="2" />
      <path d="M212 132 C222 152 244 156 254 142 Z" fill="#d58a3b" stroke="#7d451e" stroke-width="1.6" />
      <path d="M92 100 C110 56 166 42 224 50 C276 58 306 78 318 100 C306 122 276 142 224 150 C166 158 110 144 92 100 Z" fill="url(#${uid}-body)" stroke="#7d451e" stroke-width="2.4" />
      <path d="M118 122 C150 140 200 146 252 136 C226 150 166 154 124 138 Z" fill="#ffe9b5" opacity="0.5" />
      <g fill="none" stroke="#9f5c26" stroke-width="1.4" opacity="0.55">${scales}</g>
      <path d="M256 78 C248 90 248 110 256 122" fill="none" stroke="#8d4f20" stroke-width="2" opacity="0.65" />
      <path d="M308 96 C298 99 296 105 300 111" fill="none" stroke="#6e3b17" stroke-width="2.4" stroke-linecap="round" />
      <path d="M312 108 C324 114 331 121 334 130" fill="none" stroke="#6e3b17" stroke-width="2" stroke-linecap="round" opacity="0.8" />
      <path d="M311 112 C321 120 325 128 324 137" fill="none" stroke="#6e3b17" stroke-width="2" stroke-linecap="round" opacity="0.8" />
      <circle cx="284" cy="92" r="9" fill="#fff3ce" stroke="#7a451c" stroke-width="1.5" />
      <circle cx="286" cy="93" r="4.5" fill="#24170c" />
      <circle cx="284.5" cy="90.5" r="1.6" fill="#ffffff" />
      <ellipse cx="208" cy="72" rx="42" ry="11" fill="#ffffff" opacity="0.32" transform="rotate(-7 208 72)" />
    </g>`,
    'fish-art--carp'
  );
}

function golden(uid: string): string {
  const rays = [
    'M154 52 L146 26', 'M168 48 L164 20', 'M184 46 L186 16', 'M200 46 L208 18',
    'M216 48 L230 24', 'M230 52 L248 32'
  ]
    .map((d) => `<path d="${d}" />`)
    .join('');
  return wrap(
    `<defs>
      <linearGradient id="${uid}-body" x1="0" y1="0" x2="0.9" y2="1">
        <stop offset="0" stop-color="#fffbd6" />
        <stop offset="0.38" stop-color="#ffe070" />
        <stop offset="0.72" stop-color="#f4b52f" />
        <stop offset="1" stop-color="#c98716" />
      </linearGradient>
      <linearGradient id="${uid}-fin" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff4a8" stop-opacity="0.95" />
        <stop offset="1" stop-color="#e7a91f" stop-opacity="0.75" />
      </linearGradient>
      <radialGradient id="${uid}-halo">
        <stop offset="0" stop-color="#ffe98a" stop-opacity="0.5" />
        <stop offset="1" stop-color="#ffe98a" stop-opacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx="190" cy="166" rx="124" ry="15" fill="#0a3036" opacity="0.18" />
    <ellipse cx="188" cy="100" rx="150" ry="76" fill="url(#${uid}-halo)" />
    <g class="fish-art__fish">
      <path d="M88 100 C64 76 34 54 16 58 C38 80 44 94 42 100 C44 106 38 120 16 142 C34 146 64 124 88 100 Z" fill="url(#${uid}-fin)" stroke="#c98d1c" stroke-width="2" />
      <path d="M150 54 C158 34 182 24 206 32 C228 38 244 48 250 54 L242 64 C222 46 178 44 158 66 Z" fill="url(#${uid}-fin)" stroke="#c98d1c" stroke-width="2" />
      <g fill="none" stroke="#f7d45c" stroke-width="2" opacity="0.8">${rays}</g>
      <path d="M214 132 C224 154 246 160 258 146 C250 152 236 150 228 138 Z" fill="url(#${uid}-fin)" stroke="#c98d1c" stroke-width="1.6" />
      <path d="M88 100 C110 60 164 46 222 52 C276 58 308 78 322 100 C308 122 276 142 222 148 C164 154 110 140 88 100 Z" fill="url(#${uid}-body)" stroke="#bb7d11" stroke-width="2.4" />
      <path d="M116 120 C148 138 200 144 256 134 C230 148 166 152 122 136 Z" fill="#fffbe0" opacity="0.55" />
      <path d="M112 101 C166 88 238 88 300 99" fill="none" stroke="#fff8c4" stroke-width="3" opacity="0.65" />
      <g fill="none" stroke="#d1961a" stroke-width="1.3" opacity="0.5">
        <path d="M142 92 q9 10 0 20" />
        <path d="M166 86 q9 10 0 20" />
        <path d="M190 84 q9 10 0 20" />
        <path d="M214 86 q9 10 0 20" />
        <path d="M238 90 q9 10 0 20" />
        <path d="M258 96 q8 9 0 18" />
      </g>
      <path d="M260 78 C252 90 252 110 260 122" fill="none" stroke="#b27610" stroke-width="2" opacity="0.65" />
      <path d="M312 98 C303 101 300 106 304 111" fill="none" stroke="#9e6508" stroke-width="2.4" stroke-linecap="round" />
      <path d="M316 108 C328 114 335 121 338 130" fill="none" stroke="#9e6508" stroke-width="2" stroke-linecap="round" opacity="0.75" />
      <circle cx="288" cy="92" r="9" fill="#fffbe3" stroke="#a56b0b" stroke-width="1.5" />
      <circle cx="290" cy="93" r="4.5" fill="#2a1c06" />
      <circle cx="288.5" cy="90.5" r="1.6" fill="#ffffff" />
      <ellipse cx="218" cy="72" rx="42" ry="10" fill="#ffffff" opacity="0.42" transform="rotate(-8 218 72)" />
    </g>
    <g fill="#ffe892" class="fish-art__sparkles">
      <path d="M64 44 L67 52 L75 55 L67 58 L64 66 L61 58 L53 55 L61 52 Z" />
      <path d="M316 44 L318 50 L324 52 L318 54 L316 60 L314 54 L308 52 L314 50 Z" opacity="0.8" />
      <path d="M300 150 L302 155 L307 157 L302 159 L300 164 L298 159 L293 157 L298 155 Z" opacity="0.75" />
      <path d="M54 140 L56 145 L61 147 L56 149 L54 154 L52 149 L47 147 L52 145 Z" opacity="0.6" />
    </g>
    <g fill="none" stroke="#bb7d11" stroke-width="2" opacity="0.45">
      <circle cx="54" cy="76" r="4" />
      <circle cx="42" cy="62" r="2.5" />
    </g>`,
    'fish-art--golden'
  );
}

export function fishIllustrationSvg(fishId: FishId): string {
  const uid = `fish-art-${artCounter++}`;
  switch (fishId) {
    case 'fish-trout':
      return trout(uid);
    case 'fish-carp':
      return carp(uid);
    case 'fish-golden':
      return golden(uid);
    default:
      return lambari(uid);
  }
}
