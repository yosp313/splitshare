import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const dbPath = process.env.DB_PATH || join(process.cwd(), 'data', 'splitshare.sqlite');
const backupDir = process.env.BACKUP_DIR || join(process.cwd(), 'data', 'backups');
const keep = Number(process.env.BACKUP_KEEP || 7);

if (!existsSync(dbPath)) {
  console.log(`backup skipped: ${dbPath} does not exist yet`);
  process.exit(0);
}
mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
copyFileSync(dbPath, join(backupDir, `splitshare-${stamp}.sqlite`));
const files = readdirSync(backupDir).filter((f) => f.startsWith('splitshare-')).sort();
while (files.length > keep) rmSync(join(backupDir, files.shift()), { force: true });
console.log(`backup ok: ${files.at(-1)} (${files.length} kept)`);
