import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import Head from "@/components/Head";
import { ArrowUpRight, BellRing, CalendarDays, Check, ChevronRight, Droplets, Menu, ShieldCheck, Sparkles, UsersRound, WalletCards } from "lucide-react";
import { Link } from "wouter";

const featureCards = [
  {
    icon: WalletCards,
    eyebrow: "Administrasi",
    title: "Tagihan lebih tertib",
    description: "Buat kategori iuran sendiri, terbitkan periode tagihan, dan verifikasi bukti pembayaran tanpa spreadsheet yang terpisah.",
    accent: "bg-[#e9f3ef] text-[#1f6a55]",
  },
  {
    icon: CalendarDays,
    eyebrow: "Kegiatan",
    title: "Acara yang terasa dekat",
    description: "Susun agenda warga, catat kehadiran, dan kirim pengingat yang relevan sebelum kegiatan dimulai.",
    accent: "bg-[#f8eddc] text-[#9a5b22]",
  },
  {
    icon: UsersRound,
    eyebrow: "Keterhubungan",
    title: "Forum berbasis konteks",
    description: "Diskusi tetap terhubung dengan acara, pengumuman, dan kampanye yang sedang berjalan di lingkungan.",
    accent: "bg-[#e8eef8] text-[#315b9a]",
  },
];

const footerLinks = ["Panduan penggunaan", "Kebijakan privasi", "Hubungi pengurus"];

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen overflow-hidden bg-[#f8f8f5] text-[#17352f]"><Head title="Smart Warga · Ruang bersama untuk lingkungan" description="Platform manajemen RT/RW untuk iuran, acara, donasi, dan forum warga." canonicalPath="/" />
      <header className="relative z-20 border-b border-[#dfe8e2]/80 bg-[#f8f8f5]/90 backdrop-blur-xl">
        <div className="container flex h-[74px] items-center justify-between gap-5">
          <Link href="/" className="flex items-center gap-3" aria-label="Smart Warga home">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#173b33] text-[#f7d58e] shadow-[0_8px_24px_rgba(23,59,51,0.16)]">
              <span className="absolute h-4 w-4 rounded-full border-[3px] border-[#f7d58e]" />
              <span className="absolute bottom-[9px] h-[3px] w-5 rounded-full bg-[#f7d58e]" />
            </span>
            <span className="leading-none">
              <span className="block text-[15px] font-semibold tracking-[-0.02em] text-[#17352f]">smart warga</span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.22em] text-[#789087]">ruang bersama</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-[13px] font-medium text-[#58706a] md:flex" aria-label="Primary navigation">
            <a href="#fitur" className="transition-colors hover:text-[#17352f]">Fitur</a>
            <a href="#cara-kerja" className="transition-colors hover:text-[#17352f]">Cara kerja</a>
            <a href="#nilai" className="transition-colors hover:text-[#17352f]">Nilai kami</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link href={isAuthenticated ? "/app" : "/app"}>
              <Button variant="ghost" className="hidden h-10 rounded-full px-4 text-[13px] font-semibold text-[#47665e] hover:bg-[#e9f0eb] sm:inline-flex">
                {isAuthenticated ? "Buka ruang warga" : "Masuk"}
              </Button>
            </Link>
            <Link href="/app">
              <Button className="h-10 rounded-full bg-[#e4b65b] px-5 text-[13px] font-bold text-[#17352f] shadow-[0_7px_18px_rgba(187,137,46,0.18)] transition-all hover:bg-[#efc875] active:scale-[0.97]">
                Mulai sekarang <ArrowUpRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dce6df] text-[#47665e] md:hidden" aria-label="Buka menu">
              <Menu className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative border-b border-[#dfe8e2] bg-[#f8f8f5]">
          <div className="pointer-events-none absolute -right-20 top-12 h-80 w-80 rounded-full bg-[#f4e2b9]/35 blur-3xl" />
          <div className="pointer-events-none absolute -left-40 bottom-0 h-72 w-72 rounded-full bg-[#d9ebe2]/45 blur-3xl" />
          <div className="container relative grid gap-12 pb-20 pt-14 sm:pb-24 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-24">
            <div className="max-w-[640px]">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dbe6df] bg-white/65 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#5d786e] shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#c09132]" />
                Administrasi warga, dengan rasa memiliki
              </div>
              <h1 className="max-w-[680px] text-[clamp(2.65rem,8vw,5.7rem)] font-semibold leading-[0.99] tracking-[-0.065em] text-[#173b33]">
                Satu ruang untuk <span className="text-[#b37b2c]">lingkungan</span> yang lebih hidup.
              </h1>
              <p className="mt-7 max-w-[540px] text-[16px] leading-7 text-[#657a73] sm:text-[18px] sm:leading-8">
                Smart Warga membantu pengurus dan warga mengelola iuran, acara, donasi, serta percakapan sehari-hari dengan lebih ringan, jelas, dan terpercaya.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/app">
                  <Button className="h-12 w-full rounded-full bg-[#173b33] px-6 text-[14px] font-bold text-white shadow-[0_12px_26px_rgba(23,59,51,0.19)] hover:bg-[#255649] active:scale-[0.98] sm:w-auto">
                    Jelajahi ruang warga <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#fitur" className="flex h-12 items-center justify-center gap-1.5 rounded-full px-5 text-[14px] font-semibold text-[#4f7066] transition-colors hover:bg-white sm:justify-start">
                  Lihat yang bisa dikelola <ChevronRight className="h-4 w-4" />
                </a>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3 text-[12px] font-medium text-[#72857d]">
                <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#3d8b6f]" /> Mobile-first</span>
                <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#3d8b6f]" /> Data terjaga</span>
                <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#3d8b6f]" /> Bisa dipasang</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[480px] lg:ml-auto">
              <div className="absolute -left-5 top-16 hidden -rotate-6 rounded-2xl border border-[#e7ddd0] bg-[#fffaf0] px-4 py-3 shadow-[0_18px_40px_rgba(128,91,39,0.10)] sm:block">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9b6b2b]"><BellRing className="h-3.5 w-3.5" /> pengingat aktif</div>
                <p className="mt-1 text-[12px] font-semibold text-[#6f5b3d]">Rapat warga · besok 19.30</p>
              </div>
              <div className="absolute -right-3 bottom-16 hidden rotate-3 rounded-2xl border border-[#d9e9df] bg-white px-4 py-3 shadow-[0_18px_40px_rgba(42,92,71,0.11)] sm:block">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#2e7d63]"><ShieldCheck className="h-3.5 w-3.5" /> terverifikasi</div>
                <p className="mt-1 text-[12px] font-semibold text-[#44645a]">Bukti pembayaran tersimpan</p>
              </div>
              <div className="relative overflow-hidden rounded-[30px] border border-[#d6e2db] bg-[#e8f0ea] p-3 shadow-[0_28px_80px_rgba(38,83,67,0.16)] sm:p-4">
                <div className="rounded-[22px] bg-[#f8fbf7] p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7d9388]">Ruang warga</p>
                      <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-[#1b4036]">Kampung Melati</h2>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e6f0ea] text-[#31775f]"><UsersRound className="h-4 w-4" /></div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-[#173b33] p-4 text-white">
                      <div className="flex items-center justify-between"><span className="text-[11px] text-[#b9d2c7]">Iuran bulan ini</span><Droplets className="h-4 w-4 text-[#f1c76d]" /></div>
                      <p className="mt-4 text-[21px] font-semibold tracking-[-0.04em]">Rp 75.000</p>
                      <p className="mt-1 text-[10px] text-[#b9d2c7]">Jatuh tempo 10 Mei</p>
                    </div>
                    <div className="rounded-2xl border border-[#e2ebe5] bg-white p-4">
                      <span className="text-[11px] text-[#7d9388]">Agenda dekat</span>
                      <p className="mt-4 text-[21px] font-semibold tracking-[-0.04em] text-[#244c40]">03</p>
                      <p className="mt-1 text-[10px] text-[#82968e]">acara minggu ini</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl border border-[#e2ebe5] bg-white p-4">
                    <div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-[#526e64]">Aktivitas lingkungan</span><span className="rounded-full bg-[#e6f3ed] px-2 py-1 text-[10px] font-bold text-[#368265]">aktif</span></div>
                    <div className="mt-4 flex items-end gap-1.5" aria-label="Grafik aktivitas contoh">
                      {[35, 52, 42, 68, 58, 82, 72, 94, 75, 88, 80, 100].map((height, index) => <span key={index} className={`flex-1 rounded-t-md ${index > 7 ? "bg-[#c9953c]" : "bg-[#a9cdbd]"}`} style={{ height: `${height * 0.42}px` }} />)}
                    </div>
                    <div className="mt-2 flex justify-between text-[9px] font-medium uppercase tracking-[0.08em] text-[#9aac9f]"><span>minggu 1</span><span>minggu 4</span></div>
                  </div>
                </div>
                <div className="flex items-center justify-between px-2 pt-3 text-[10px] font-semibold text-[#658178]"><span>Selamat datang, warga.</span><span className="inline-flex items-center gap-1 text-[#2e7d63]"><span className="h-1.5 w-1.5 rounded-full bg-[#5ca883]" /> Tersambung</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="nilai" className="border-b border-[#dfe8e2] bg-[#173b33] text-white">
          <div className="container grid gap-8 py-8 sm:grid-cols-3 sm:gap-10 sm:py-10">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9ec1b2]">Lebih jelas</p><p className="mt-2 text-[15px] leading-6 text-[#e5f0e9]">Semua informasi penting berada di tempat yang mudah ditemukan warga.</p></div>
            <div className="border-[#426b5d] sm:border-l sm:pl-8"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9ec1b2]">Lebih dekat</p><p className="mt-2 text-[15px] leading-6 text-[#e5f0e9]">Pengumuman dan agenda hadir dengan konteks, bukan sekadar broadcast.</p></div>
            <div className="border-[#426b5d] sm:border-l sm:pl-8"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9ec1b2]">Lebih aman</p><p className="mt-2 text-[15px] leading-6 text-[#e5f0e9]">Akses pengurus dan warga dibatasi sesuai kebutuhan serta perannya.</p></div>
          </div>
        </section>

        <section id="fitur" className="bg-[#f8f8f5]">
          <div className="container py-20 sm:py-24 lg:py-28">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-[600px]"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#b37b2c]">Dibuat untuk ritme warga</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#173b33] sm:text-5xl">Rapi di belakang layar. Hangat di depan mata.</h2></div>
              <p className="max-w-[310px] text-sm leading-6 text-[#6e8178]">Bukan sekadar panel administrasi. Ini adalah ruang bersama untuk membuat urusan lingkungan terasa lebih manusiawi.</p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {featureCards.map(({ icon: Icon, eyebrow, title, description, accent }) => <article key={title} className="group rounded-[24px] border border-[#e0e9e2] bg-white p-6 shadow-[0_8px_30px_rgba(44,72,57,0.04)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(44,72,57,0.09)] sm:p-7"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent}`}><Icon className="h-5 w-5" /></div><p className="mt-8 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9aaa9f]">{eyebrow}</p><h3 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-[#23483d]">{title}</h3><p className="mt-3 text-[14px] leading-6 text-[#71827b]">{description}</p><a href="#cara-kerja" className="mt-6 inline-flex items-center gap-1 text-[12px] font-bold text-[#33755d]">Pelajari alurnya <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></a></article>)}
            </div>
          </div>
        </section>

        <section id="cara-kerja" className="border-t border-[#dfe8e2] bg-[#eef4ef]">
          <div className="container grid gap-10 py-20 sm:py-24 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-20 lg:py-28">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#b37b2c]">Mulai dari yang penting</p><h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.05em] text-[#173b33] sm:text-5xl">Satu langkah kecil untuk tata kelola yang konsisten.</h2><p className="mt-5 max-w-[460px] text-[15px] leading-7 text-[#71827b]">Pengurus dapat membangun kebiasaan administrasi yang tertata tanpa meminta warga belajar sistem yang rumit.</p><Link href="/app"><Button className="mt-8 h-11 rounded-full bg-[#173b33] px-5 text-sm font-bold text-white hover:bg-[#255649]">Lihat dashboard <ArrowUpRight className="ml-2 h-4 w-4" /></Button></Link></div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[{ number: "01", title: "Atur ruang", text: "Buat wilayah, peran, dan akses sesuai struktur RT/RW." }, { number: "02", title: "Bagikan konteks", text: "Terbitkan iuran, acara, atau kampanye dengan jelas." }, { number: "03", title: "Jaga kepercayaan", text: "Verifikasi, catat, dan tampilkan progres secara transparan." }].map((item) => <div key={item.number} className="rounded-[22px] border border-[#d7e4da] bg-white/75 p-5 sm:p-6"><span className="text-[12px] font-bold text-[#b37b2c]">{item.number}</span><h3 className="mt-9 text-lg font-semibold tracking-[-0.03em] text-[#23483d]">{item.title}</h3><p className="mt-2 text-[13px] leading-5 text-[#778a81]">{item.text}</p></div>)}
            </div>
          </div>
        </section>

        <section className="bg-[#f8f8f5]">
          <div className="container py-16 sm:py-20"><div className="relative overflow-hidden rounded-[28px] bg-[#e4b65b] px-6 py-10 sm:px-12 sm:py-14 lg:px-16"><div className="pointer-events-none absolute -right-8 -top-20 h-72 w-72 rounded-full border-[42px] border-[#f8db96]/55" /><div className="relative max-w-[620px]"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#725323]">Ruang yang tumbuh bersama</p><h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.05em] text-[#173b33] sm:text-5xl">Mari mulai dari satu lingkungan.</h2><p className="mt-4 max-w-[510px] text-[15px] leading-7 text-[#6f5627]">Uji alur kerja yang paling dibutuhkan warga hari ini, lalu biarkan sistem berkembang mengikuti kebiasaan komunitas.</p><Link href="/app"><Button className="mt-7 h-11 rounded-full bg-[#173b33] px-5 text-sm font-bold text-white hover:bg-[#255649]">Buka Smart Warga <ArrowUpRight className="ml-2 h-4 w-4" /></Button></Link></div></div></div>
        </section>
      </main>

      <footer className="border-t border-[#dfe8e2] bg-[#f8f8f5]">
        <div className="container flex flex-col gap-5 py-8 text-[12px] text-[#789087] sm:flex-row sm:items-center sm:justify-between"><span>© 2026 Smart Warga · Ruang bersama untuk lingkungan.</span><div className="flex flex-wrap gap-x-5 gap-y-2">{footerLinks.map((link) => <a href="#" key={link} className="transition-colors hover:text-[#173b33]">{link}</a>)}</div></div>
      </footer>
    </div>
  );
}
