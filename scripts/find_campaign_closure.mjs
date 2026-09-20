import fs from 'node:fs';
const text = fs.readFileSync('client/src/pages/WorkspacePage.tsx', 'utf8');
const marker = '{canReviewDonations && <Card className="mt-5 rounded-[24px] border-[#e0e9e2] bg-white shadow-sm"><CardHeader className="px-5 pb-3 pt-5 sm:px-6"><CardTitle className="text-lg tracking-[-0.03em] text-[#23483d]">Draft kampanye';
const i = text.indexOf(marker);
console.log(JSON.stringify(text.slice(i - 40, i + 60)));
