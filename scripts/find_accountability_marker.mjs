import fs from 'node:fs';
const text = fs.readFileSync('client/src/pages/WorkspacePage.tsx', 'utf8');
const marker = 'Akuntabilitas';
const i = text.indexOf(marker);
console.log(i);
console.log(JSON.stringify(text.slice(i - 220, i + 120)));
