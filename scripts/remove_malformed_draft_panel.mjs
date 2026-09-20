import fs from 'node:fs';
const path = 'client/src/pages/WorkspacePage.tsx';
const text = fs.readFileSync(path, 'utf8');
const startMarker = '{canReviewDonations && <Card className="mt-5 rounded-[24px] border-[#e0e9e2] bg-white shadow-sm"><CardHeader className="px-5 pb-3 pt-5 sm:px-6"><CardTitle className="text-lg tracking-[-0.03em] text-[#23483d]">Draft kampanye</CardTitle>';
const endMarker = '<Card className="mt-5 rounded-[24px] border-[#e0e9e2] bg-[#eef5ef] shadow-sm">';
const start = text.indexOf(startMarker);
const end = text.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error(`markers not found: ${start}, ${end}`);
fs.writeFileSync(path, text.slice(0, start) + text.slice(end));
