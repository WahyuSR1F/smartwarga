import { Button } from "@/components/ui/button";
import Head from "@/components/Head";
import { ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, HeartHandshake, MapPin, Megaphone, ShieldCheck, UsersRound } from "lucide-react";
import { Link, useLocation } from "wouter";

const publicContent = {
  wilayah: {
    label: "Profil wilayah",
    title: "Kampung Melati · RW 04",
    description: "Ruang informasi publik untuk mengenal kegiatan, layanan, dan kabar terbaru dari lingkungan Kampung Melati.",
    facts: [{ icon: UsersRound, title: "Ruang terdaftar", text: "Struktur wilayah dikelola dalam satu ruang administrasi." }, { icon: CalendarDays, title: "Agenda terbuka", text: "Kegiatan publik ditampilkan setelah disetujui pengurus." }, { icon: ShieldCheck, title: "Data terlindungi", text: "Informasi internal tetap hanya untuk warga terautentikasi." }],
  },
  acara: {
    label: "Agenda warga",
    title: "Rembuk warga bulanan",
    description: "Mari menyamakan kabar dan merapikan langkah untuk lingkungan yang lebih nyaman.",
    facts: [{ icon: CalendarDays, title: "Jadwal diumumkan", text: "Waktu kegiatan tampil setelah dikonfirmasi pengurus." }, { icon: MapPin, title: "Lokasi kegiatan", text: "Detail tempat tersedia pada agenda yang diterbitkan." }, { icon: UsersRound, title: "Terbuka untuk warga", text: "Pendaftaran tersedia di ruang warga setelah publikasi." }],
  },
  donasi: {
    label: "Kampanye sosial",
    title: "Perbaikan pos ronda",
    description: "Bersama memperbaiki ruang jaga agar keamanan lingkungan tetap menjadi tanggung jawab bersama.",
    facts: [{ icon: HeartHandshake, title: "Target kampanye", text: "Tujuan dan target ditetapkan oleh pengurus wilayah." }, { icon: UsersRound, title: "Kontribusi terverifikasi", text: "Donasi dicatat dan diperiksa melalui ruang warga." }, { icon: ShieldCheck, title: "Pembaruan berkala", text: "Penggunaan dana dilaporkan kepada warga." }],
  },
  pengumuman: {
    label: "Informasi warga",
    title: "Kabar lingkungan",
    description: "Pengumuman resmi dari pengurus wilayah disusun agar mudah ditemukan, dipahami, dan ditindaklanjuti warga.",
    facts: [{ icon: Megaphone, title: "Informasi resmi", text: "Kabar tampil setelah diterbitkan oleh pengurus yang berwenang." }, { icon: CalendarDays, title: "Konteks jelas", text: "Tanggal dan tindakan penting dapat dirangkum dalam satu halaman." }, { icon: ShieldCheck, title: "Privasi terjaga", text: "Informasi internal tetap berada di ruang warga terautentikasi." }],
  },
};

export default function PublicInfoPage() {
  const [location] = useLocation();
  const [segment, rawSlug] = location.split("/").slice(1);
  const type = segment as keyof typeof publicContent;
  const content = publicContent[type] ?? publicContent.wilayah;
  const slugName = (rawSlug ?? "kampung-melati").split("-").map(word => word ? word[0].toUpperCase() + word.slice(1) : word).join(" ");
  const pageTitle = type === "wilayah" ? `${slugName} · ${content.title}` : `${content.title} · ${slugName}`;
  return <div className="min-h-screen bg-[#f8f8f5] text-[#17352f]"><Head title={`${pageTitle} · Smart Warga`} description={`${content.description} Informasi publik ${slugName}.`} canonicalPath={location} type={type === "wilayah" ? "website" : "article"} /><header className="border-b border-[#dfe8e2] bg-[#f8f8f5]/90 backdrop-blur-xl"><div className="container flex h-[74px] items-center justify-between"><Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#173b33] text-[#f7d58e]"><span className="h-4 w-4 rounded-full border-[3px] border-[#f7d58e]" /></span><span><span className="block text-[15px] font-semibold text-[#17352f]">smart warga</span><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#789087]">ruang bersama</span></span></Link><Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-[#4e7065]"><ArrowLeft className="h-4 w-4" /> Kembali</Link></div></header><main className="container max-w-5xl py-14 sm:py-20"><div className="max-w-3xl"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#b37b2c]">{content.label}</p><h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-[#173b33] sm:text-6xl">{pageTitle}</h1><p className="mt-6 max-w-2xl text-base leading-8 text-[#6f8279] sm:text-lg">{content.description}</p><Link href="/app"><Button className="mt-8 h-11 rounded-full bg-[#173b33] px-5 text-sm font-bold text-white hover:bg-[#255649]">Buka ruang warga <ArrowUpRight className="ml-2 h-4 w-4" /></Button></Link></div><div className="mt-14 grid gap-4 sm:grid-cols-3">{content.facts.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-[24px] border border-[#dfe9e2] bg-white p-5 shadow-[0_8px_30px_rgba(44,72,57,0.04)]"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7f2eb] text-[#34785e]"><Icon className="h-4 w-4" /></div><h2 className="mt-7 text-base font-semibold text-[#35574c]">{title}</h2><p className="mt-2 text-sm leading-6 text-[#7b8e85]">{text}</p></article>)}</div><div className="mt-8 rounded-[24px] border border-[#dbe7de] bg-[#edf5ef] p-6 sm:p-8"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a6e2e]">Catatan privasi</p><p className="mt-3 max-w-2xl text-sm leading-7 text-[#6d8176]">Halaman ini hanya menampilkan informasi yang disetujui untuk publik. Detail warga, keuangan, dan percakapan internal tersedia setelah autentikasi di ruang komunitas.</p></div></main></div>;
}
