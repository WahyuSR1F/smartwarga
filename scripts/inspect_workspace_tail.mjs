import fs from 'node:fs';
const line = fs.readFileSync('client/src/pages/WorkspacePage.tsx', 'utf8').split('\n')[106];
console.log(JSON.stringify(line.slice(12700, 13600)));
