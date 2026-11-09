import { readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const scriptDir = dirname(fileURLToPath(import.meta.url));
const musicDir = join(scriptDir, '../public/music');
const manifestPath = join(musicDir, 'playlist.json');
try {
  const files = await readdir(musicDir, { withFileTypes: true });
  const tracks = files.filter((file) => file.isFile() && file.name.toLowerCase().endsWith('.mp3'))
    .map((file) => '/music/' + encodeURIComponent(file.name)).sort();
  await writeFile(manifestPath, JSON.stringify(tracks, null, 2) + String.fromCharCode(10), 'utf8');
  console.log('[music] Playlist gerada: ' + tracks.length + ' faixa(s).');
} catch (error) {
  console.error('[music] Erro ao gerar playlist:', error);
  process.exitCode = 1;
}
