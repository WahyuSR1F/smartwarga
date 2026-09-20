import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, ChevronRight, Clock3, MoreHorizontal, Plus, ShieldCheck, Sparkles, UsersRound, WalletCards } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const navLabels: Record<string, string> = {
  "/app": "Ringkasan",
  "/app/warga": "Data warga",
  "/app/tagihan": "Tagihan",
  "/app/acara": "Acara",
  "/app/donasi": "Donasi",
  "/app/forum": "Forum warga",
};

export default function CommunityDashboard() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { data: memberships } = trpc.community.organizations.useQuery();
  const organizationId = memberships?.[0]?.organization.id;
  const { data: summary } = trpc.community.summary.useQuery({ organizationId: organizationId ?? "pending" }, { enabled: Boolean(organizationId) });
  const { data: upcomingEvents } = trpc.events.list.useQuery({ organizationId: organizationId ?? "pending" }, { enabled: Boolean(organizationId) });
  const activeLabel = navLabels[location] ?? "Ringkasan";
  const isResidentView = activeLabel === "Ringkasan";

  return (
    <div className="mx-auto max-w-[1360px] space-y-8 pb-8">
      <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#9a6e2e]"><span className="h-2 w-2 rounded-full bg-[#d4a34c]" /> Ruang warga · RW 04 / RT 07</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#183d34] sm:text-4xl">{isResidentView ? `Selamat datang, ${user?.name ?? "warga"}.` : activeLabel}</h1>
          <p className="mt-2 max-w-[600px] text-sm leading-6 text-[#70857b]">{isResidentView ? "Berikut kabar terbaru dan hal yang perlu Anda perhatikan di lingkungan Kampung Melati." : `Kelola ${activeLabel.toLowerCase()} dengan alur yang ringkas dan terukur.`}</p>
        </div>
        <div className="flex items-center gap-2"><Button variant="outline" className="h-10 rounded-xl border-[#dbe7df] bg-white text-[#46675b] hover:bg-[#f3f7f4]"><Clock3 className="mr-2 h-4 w-4" /> {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</Button><Button className="h-10 rounded-xl bg-[#173b33] text-white shadow-sm hover:bg-[#255649]"><Plus className="mr-2 h-4 w-4" /> Buat baru</Button></div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Warga terdaftar" value={summary ? summary.residents.toLocaleString("id-ID") : "—"} helper="Anggota wilayah aktif" icon={UsersRound} tone="green" />
        <MetricCard label="Invoice tercatat" value={summary ? summary.invoices.toLocaleString("id-ID") : "—"} helper="Seluruh periode" icon={WalletCards} tone="gold" />
        <MetricCard label="Acara tercatat" value={summary ? summary.events.toLocaleString("id-ID") : "—"} helper="Agenda wilayah" icon={CalendarDays} tone="blue" />
        <MetricCard label="Kampanye donasi" value={summary ? summary.campaigns.toLocaleString("id-ID") : "—"} helper="Kampanye terpublikasi" icon={ShieldCheck} tone="purple" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden rounded-[24px] border-[#e0e9e2] bg-white shadow-[0_8px_30px_rgba(44,72,57,0.04)]">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b border-[#edf2ee] px-5 pb-4 pt-5 sm:px-6 sm:pt-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a0b0a7]">Ringkasan bulan berjalan</p><CardTitle className="mt-1 text-lg tracking-[-0.03em] text-[#23483d]">Kesehatan administrasi</CardTitle></div><Button variant="ghost" className="h-8 rounded-lg px-2 text-[#799087] hover:bg-[#f2f7f3]"><MoreHorizontal className="h-4 w-4" /></Button></CardHeader>
          <CardContent className="p-5 sm:p-6"><div className="rounded-2xl border border-[#dce9df] bg-[#f7fbf8] p-5"><p className="text-sm font-semibold text-[#35574c]">Ringkasan berbasis data aktual</p><p className="mt-2 text-xs leading-5 text-[#789087]">Persentase penyelesaian dan tren historis belum tersedia sebagai metrik tersimpan, jadi dashboard tidak menampilkan angka perkiraan.</p><div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-[#438367]"><ShieldCheck className="h-3.5 w-3.5" /> Data yang tersedia tetap ditampilkan pada kartu ringkasan di atas.</div></div></CardContent>
        </Card>

        <Card className="rounded-[24px] border-[#e0e9e2] bg-[#173b33] text-white shadow-[0_8px_30px_rgba(44,72,57,0.10)]"><CardHeader className="px-5 pb-1 pt-5 sm:px-6 sm:pt-6"><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9ec1b2]">Perlu perhatian</p><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#295648]"><Sparkles className="h-4 w-4 text-[#f0c86f]" /></span></div><CardTitle className="mt-3 text-xl tracking-[-0.04em] text-white">Tidak ada tugas sintetis</CardTitle></CardHeader><CardContent className="px-5 pb-5 sm:px-6 sm:pb-6"><div className="mt-3 rounded-xl border border-[#3b6859] bg-[#214b3f] p-4"><p className="text-[12px] font-semibold text-[#e5f1ea]">Tugas akan muncul dari data aktual</p><p className="mt-1 text-[10px] leading-5 text-[#a8c6b7]">Dashboard tidak lagi menampilkan jumlah pengajuan, kehadiran, atau laporan yang dibuat-buat.</p></div><Link href="/app/warga"><Button variant="outline" className="mt-5 h-10 w-full rounded-xl border-[#467263] bg-transparent text-[#d8e9df] hover:bg-[#295648] hover:text-white">Buka data warga <ChevronRight className="ml-1 h-4 w-4" /></Button></Link></CardContent></Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card className="rounded-[24px] border-[#e0e9e2] bg-white shadow-[0_8px_30px_rgba(44,72,57,0.04)]"><CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pb-3 pt-5 sm:px-6 sm:pt-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a0b0a7]">Agenda terdekat</p><CardTitle className="mt-1 text-lg tracking-[-0.03em] text-[#23483d]">Kegiatan lingkungan</CardTitle></div><Link href="/app/acara"><Button variant="ghost" className="h-8 px-2 text-xs font-bold text-[#3e8067] hover:bg-[#f2f7f3]">Lihat semua <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button></Link></CardHeader><CardContent className="px-5 pb-5 sm:px-6 sm:pb-6"><div className="divide-y divide-[#edf2ee]">{upcomingEvents?.length ? upcomingEvents.slice(0, 3).map(({ event, attendeeCount }) => <div key={event.id} className="flex items-center gap-3 py-4 first:pt-2 last:pb-0"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f3ec] text-[#398065]"><CalendarDays className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#35574c]">{event.title}</p><p className="mt-1 text-xs text-[#8a9b92]">{new Date(event.startsAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} · {attendeeCount ?? 0} peserta</p></div><Button variant="ghost" className="h-8 w-8 shrink-0 rounded-lg p-0 text-[#a2b0a8] hover:bg-[#f3f7f4] hover:text-[#3e8067]"><ChevronRight className="h-4 w-4" /></Button></div>) : <p className="py-8 text-sm text-[#8a9b92]">Belum ada agenda di wilayah ini.</p>}</div></CardContent></Card>

        <Card className="rounded-[24px] border-[#e0e9e2] bg-white shadow-[0_8px_30px_rgba(44,72,57,0.04)]"><CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pb-3 pt-5 sm:px-6 sm:pt-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a0b0a7]">Aktivitas terbaru</p><CardTitle className="mt-1 text-lg tracking-[-0.03em] text-[#23483d]">Jejak ruang warga</CardTitle></div><Button variant="ghost" className="h-8 px-2 text-xs font-bold text-[#3e8067] hover:bg-[#f2f7f3]">Riwayat</Button></CardHeader><CardContent className="px-5 pb-5 sm:px-6 sm:pb-6"><div className="rounded-2xl border border-dashed border-[#dce8df] bg-[#f7fbf8] p-6 text-center"><p className="text-sm font-semibold text-[#35574c]">Belum ada aktivitas terukur</p><p className="mt-1 text-xs leading-5 text-[#8a9b92]">Aktivitas akan muncul setelah data wilayah memiliki perubahan yang dapat dicatat.</p></div></CardContent></Card>
      </section>

      <section className="rounded-[24px] border border-[#dae7de] bg-[#edf5ef] p-5 sm:p-6"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d9ebe0] text-[#32785f]"><ShieldCheck className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-[#23483d]">Semua aktivitas tercatat dengan aman.</p><p className="mt-1 text-xs leading-5 text-[#71877c]">Akses data, bukti pembayaran, dan perubahan administrasi mengikuti peran masing-masing.</p></div></div><Button variant="outline" className="h-9 rounded-xl border-[#cfe0d5] bg-white text-xs font-bold text-[#3e8067] hover:bg-[#f7fbf8]">Lihat keamanan data <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button></div></section>
    </div>
  );
}

function MetricCard({ label, value, helper, icon: Icon, tone }: { label: string; value: string; helper: string; icon: typeof UsersRound; tone: string }) {
  const toneClass = tone === "green" ? "bg-[#e7f2eb] text-[#34785e]" : tone === "gold" ? "bg-[#fbf0dc] text-[#a87027]" : tone === "blue" ? "bg-[#e9eef8] text-[#466fa7]" : "bg-[#eeeafa] text-[#6d5ca5]";
  return <Card className="rounded-[22px] border-[#e0e9e2] bg-white shadow-[0_8px_30px_rgba(44,72,57,0.04)]"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-[#80948a]">{label}</p><p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[#23483d]">{value}</p><p className="mt-1 text-[11px] font-semibold text-[#6b927e]">{helper}</p></div><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}><Icon className="h-4 w-4" /></div></div></CardContent></Card>;
}


