import fs from 'node:fs';
const text = fs.readFileSync('client/src/pages/WorkspacePage.tsx', 'utf8');
const marker = 'Verifikasi kontribusi';
const i = text.indexOf(marker);
console.log(JSON.stringify(text.slice(i - 180, i + 160)));
