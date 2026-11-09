import { copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const scriptDir = dirname(fileURLToPath(import.meta.url));
const sourceDir = join(scriptDir, '../../../music');
const publicDir = join(scriptDir, '../public/music');
const manifestPath = join(publicDir, 'playlist.json');
try {
  await mkdir(publicDir, { recursive: true });
  const files = await readdir(sourceDir, { withFileTypes: true });
  const names = files.filter((file) => file.isFile() && file.name.toLowerCase().endsWith('.mp3')).map((file) => file.name).sort();
  for (const name of names) await copyFile(join(sourceDir, name), join(publicDir, name));
  const tracks = names.map((name) => '/music/' + encodeURIComponent(name));
  await writeFile(manifestPath, JSON.stringify(tracks, null, 2) + String.fromCharCode(10), 'utf8');
  console.log('[music] Playlist gerada: ' + tracks.length + ' faixa(s).');
} catch (error) {
  console.error('[music] Erro ao gerar playlist a partir da pasta music/:', error);
  process.exitCode = 1;
}
