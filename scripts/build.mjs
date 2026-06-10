import fs from 'node:fs';
import path from 'node:path';
const root = new URL('..', import.meta.url).pathname;
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
copyDir(src, dist);
function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}
console.log(`Built ${dist}`);
