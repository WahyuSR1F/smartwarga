import fs from 'node:fs';
const line = fs.readFileSync('client/src/pages/WorkspacePage.tsx', 'utf8').split('\n')[106];
for (const marker of ['return <>{canManageCampaigns', '{canReviewDonations && <Card className="mt-5 rounded-[24px] border-[#e0e9e2] bg-white shadow-sm"', '<Card className="mt-5 rounded-[24px] border-[#e0e9e2] bg-[#eef5ef]']) {
  let start = 0; let i;
  while ((i = line.indexOf(marker, start)) !== -1) { console.log(`MARKER ${marker.slice(0,30)} @ ${i}`); console.log(line.slice(Math.max(0, i-80), i+260)); start = i + marker.length; }
}
