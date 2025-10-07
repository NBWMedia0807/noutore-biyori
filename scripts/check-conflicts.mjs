import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const trackedFiles = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const conflictPattern = /<<<<<<< |>>>>>>> /;
const offenders = [];

for (const file of trackedFiles) {
  const content = readFileSync(file, 'utf8');
  if (conflictPattern.test(content)) {
    offenders.push(file);
  }
}

if (offenders.length > 0) {
  console.error('マージ衝突マーカーが残っています:\n' + offenders.join('\n'));
  process.exit(1);
}

console.log('マージ衝突マーカーは検出されませんでした。');
