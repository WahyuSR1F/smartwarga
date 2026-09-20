import fs from 'node:fs';
const line = fs.readFileSync('client/src/pages/WorkspacePage.tsx', 'utf8').split('\n')[106];
for (const offset of [13320]) {
  console.log(`OFFSET ${offset}`);
  console.log(line.slice(Math.max(0, offset - 500), offset + 500));
}
