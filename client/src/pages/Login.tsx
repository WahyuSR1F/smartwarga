import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = "organization_admin" | "rw_admin" | "rt_admin" | "treasurer" | "resident";
type RegStep = "form" | "role" | "desa" | "rw" | "rt" | "warga";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<RegStep>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("resident");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Desa form
  const [desaName, setDesaName] = useState("");

  // RW form
  const [rwName, setRwName] = useState("");
  const [rwCode, setRwCode] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");

  // RT form
  const [rtName, setRtName] = useState("");
  const [rtCode, setRtCode] = useState("");
  const [selectedRwId, setSelectedRwId] = useState("");

  // Warga form
  const [selectedJoinOrgId, setSelectedJoinOrgId] = useState("");
  const [selectedJoinRtId, setSelectedJoinRtId] = useState("");

  const { data: orgs, isLoading: orgsLoading } = trpc.publicContent.listOrganizations.useQuery();
  const { data: rwList, isLoading: rwLoading } = trpc.publicContent.listRwUnits.useQuery(
    { organizationId: selectedOrgId },
    { enabled: Boolean(selectedOrgId) }
  );

  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginMutation.mutateAsync({ email, password });
      setLocation("/app");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Nama harus diisi"); return; }
    if (!email.trim()) { setError("Email harus diisi"); return; }
    if (password.length < 6) { setError("Password minimal 6 karakter"); return; }
    setStep("role");
  };

  const handleRegister = async () => {
    setError("");
    setLoading(true);
    try {
      if (role === "organization_admin") {
        if (!desaName.trim()) { setError("Nama desa harus diisi"); setLoading(false); return; }
        const slug = slugify(desaName);
        await registerMutation.mutateAsync({
          name, email, password, role: "organization_admin",
          createOrganization: { name: desaName, slug },
        });
      } else if (role === "rw_admin") {
        if (!rwName.trim() || !rwCode.trim() || !selectedOrgId) {
          setError("Lengkapi data RW"); setLoading(false); return;
        }
        await registerMutation.mutateAsync({
          name, email, password, role: "rw_admin",
          organizationIds: [selectedOrgId],
          createRw: { name: rwName, code: rwCode, organizationId: selectedOrgId },
        });
      } else if (role === "rt_admin") {
        if (!rtName.trim() || !rtCode.trim() || !selectedRwId) {
          setError("Lengkapi data RT"); setLoading(false); return;
        }
        await registerMutation.mutateAsync({
          name, email, password, role: "rt_admin",
          organizationIds: [],
          createRt: { name: rtName, code: rtCode, rwId: selectedRwId },
        });
      } else {
        if (!selectedJoinOrgId || !selectedJoinRtId) {
          setError("Pilih RT yang ingin kamu ikuti"); setLoading(false); return;
        }
        await registerMutation.mutateAsync({
          name, email, password, role: "resident",
          organizationIds: [selectedJoinOrgId],
          joinRtId: selectedJoinRtId,
        });
      }
      setLocation("/app");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  // ========== LOGIN ==========
  if (mode === "login") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f8f5] px-5">
        <div className="w-full max-w-md rounded-[28px] border border-[#dfe9e2] bg-white p-8 shadow-[0_20px_60px_rgba(44,72,57,0.08)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#173b33] text-[#f7d58e]">
            <span className="h-5 w-5 rounded-full border-[3px] border-[#f7d58e]" />
          </div>
          <h1 className="mt-6 text-center text-2xl font-semibold tracking-[-0.04em] text-[#173b33]">Masuk ke ruang warga</h1>
          <p className="mt-3 text-center text-sm leading-6 text-[#71827b]">Masukkan email dan password untuk masuk.</p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[#345b4e]">Email</Label>
              <Input id="email" type="email" placeholder="budi@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl border-[#d9e6dd] bg-white px-4 text-sm" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-[#345b4e]">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl border-[#d9e6dd] bg-white px-4 text-sm" required />
            </div>
            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={loading} className="mt-2 h-11 w-full rounded-xl bg-[#173b33] font-bold text-white hover:bg-[#255649]">
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-[#71827b]">
            Belum punya akun?{" "}
            <button onClick={() => { setMode("register"); setStep("form"); setError(""); }} className="font-semibold text-[#173b33] hover:underline">Daftar sekarang</button>
          </p>
        </div>
      </div>
    );
  }

  // ========== REGISTER STEP: FORM DATA DIRI ==========
  if (step === "form") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f8f5] px-5">
        <div className="w-full max-w-md rounded-[28px] border border-[#dfe9e2] bg-white p-8 shadow-[0_20px_60px_rgba(44,72,57,0.08)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#173b33] text-[#f7d58e]">
            <span className="h-5 w-5 rounded-full border-[3px] border-[#f7d58e]" />
          </div>
          <h1 className="mt-6 text-center text-2xl font-semibold tracking-[-0.04em] text-[#173b33]">Buat akun baru</h1>
          <p className="mt-3 text-center text-sm leading-6 text-[#71827b]">Isi data diri terlebih dahulu.</p>

          <form onSubmit={handleFormSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#345b4e]">Nama Lengkap</Label>
              <Input type="text" placeholder="Budi Santoso" value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl border-[#d9e6dd] bg-white px-4 text-sm" required />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#345b4e]">Email</Label>
              <Input type="email" placeholder="budi@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl border-[#d9e6dd] bg-white px-4 text-sm" required />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#345b4e]">Password</Label>
              <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl border-[#d9e6dd] bg-white px-4 text-sm" required minLength={6} />
            </div>
            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <Button type="submit" className="mt-2 h-11 w-full rounded-xl bg-[#173b33] font-bold text-white hover:bg-[#255649]">Lanjut</Button>
          </form>
          <p className="mt-6 text-center text-sm text-[#71827b]">
            Sudah punya akun?{" "}
            <button onClick={() => { setMode("login"); setError(""); }} className="font-semibold text-[#173b33] hover:underline">Masuk</button>
          </p>
        </div>
      </div>
    );
  }

  // ========== REGISTER STEP: PILIH ROLE ==========
  if (step === "role") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f8f5] px-5">
        <div className="w-full max-w-md rounded-[28px] border border-[#dfe9e2] bg-white p-8 shadow-[0_20px_60px_rgba(44,72,57,0.08)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#173b33] text-[#f7d58e]">
            <span className="h-5 w-5 rounded-full border-[3px] border-[#f7d58e]" />
          </div>
          <h1 className="mt-6 text-center text-2xl font-semibold tracking-[-0.04em] text-[#173b33]">Kamu mendaftar sebagai?</h1>
          <p className="mt-3 text-center text-sm leading-6 text-[#71827b]">Pilih peran kamu di lingkungan RT/RW.</p>

          <div className="mt-8 space-y-3">
            {/* Admin Desa */}
            <button
              onClick={() => { setRole("organization_admin"); setStep("desa"); setError(""); }}
              className="w-full rounded-xl border-2 border-[#dce8df] bg-white px-5 py-4 text-left transition-all hover:border-[#173b33] hover:bg-[#f0f7f2]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173b33] text-white">
                  <span className="text-lg font-bold">🏘️</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#173b33]">Admin Desa</p>
                  <p className="mt-0.5 text-[11px] text-[#71827b]">Buat desa/kelurahan baru (1 desa = 1 admin)</p>
                </div>
              </div>
            </button>

            {/* RW Admin */}
            <button
              onClick={() => { setRole("rw_admin"); setStep("rw"); setError(""); }}
              className="w-full rounded-xl border-2 border-[#dce8df] bg-white px-5 py-4 text-left transition-all hover:border-[#173b33] hover:bg-[#f0f7f2]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173b33] text-white">
                  <span className="text-lg font-bold">RW</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#173b33]">Admin RW</p>
                  <p className="mt-0.5 text-[11px] text-[#71827b]">Buat wilayah RW baru di desa yang ada</p>
                </div>
              </div>
            </button>

            {/* RT Admin */}
            <button
              onClick={() => { setRole("rt_admin"); setStep("rt"); setError(""); }}
              className="w-full rounded-xl border-2 border-[#dce8df] bg-white px-5 py-4 text-left transition-all hover:border-[#173b33] hover:bg-[#f0f7f2]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173b33] text-white">
                  <span className="text-lg font-bold">RT</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#173b33]">Admin RT</p>
                  <p className="mt-0.5 text-[11px] text-[#71827b]">Buat wilayah RT baru di bawah RW yang ada</p>
                </div>
              </div>
            </button>

            {/* Warga */}
            <button
              onClick={() => { setRole("resident"); setStep("warga"); setError(""); }}
              className="w-full rounded-xl border-2 border-[#dce8df] bg-white px-5 py-4 text-left transition-all hover:border-[#173b33] hover:bg-[#f0f7f2]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173b33] text-white">
                  <span className="text-lg font-bold">👤</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#173b33]">Warga</p>
                  <p className="mt-0.5 text-[11px] text-[#71827b]">Gabung ke RT/RW yang sudah ada</p>
                </div>
              </div>
            </button>
          </div>

          {error && <p className="mt-4 text-center text-sm text-red-500">{error}</p>}

          <button onClick={() => setStep("form")} className="mt-6 w-full text-center text-xs text-[#71827b] hover:text-[#173b33]">
            ← Kembali
          </button>
        </div>
      </div>
    );
  }

  // ========== REGISTER STEP: BUAT DESA BARU ==========
  if (step === "desa") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f8f5] px-5">
        <div className="w-full max-w-md rounded-[28px] border border-[#dfe9e2] bg-white p-8 shadow-[0_20px_60px_rgba(44,72,57,0.08)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#173b33] text-[#f7d58e]">
            <span className="h-5 w-5 rounded-full border-[3px] border-[#f7d58e]" />
          </div>
          <h1 className="mt-6 text-center text-2xl font-semibold tracking-[-0.04em] text-[#173b33]">Buat Desa / Kelurahan Baru</h1>
          <p className="mt-3 text-center text-sm leading-6 text-[#71827b]">Masukkan nama desa atau kelurahan yang akan dikelola.</p>

          <div className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#345b4e]">Nama Desa / Kelurahan</Label>
              <Input
                placeholder="contoh: Desa Sukamaju"
                value={desaName}
                onChange={(e) => setDesaName(e.target.value)}
                className="h-11 rounded-xl border-[#d9e6dd] bg-white px-4 text-sm"
              />
              {desaName.trim() && (
                <p className="text-[11px] text-[#71827b]">Slug: {slugify(desaName)}</p>
              )}
            </div>

            <div className="rounded-xl bg-[#f0f7f2] p-4">
              <p className="text-xs font-medium text-[#345b4e]">📋 Yang akan dibuat:</p>
              <ul className="mt-2 space-y-1 text-[11px] text-[#71827b]">
                <li>• Desa/kelurahan: <strong>{desaName || "..."}</strong></li>
                <li>• Role kamu: <strong>Admin Desa</strong></li>
                <li>• Kamu bisa menambah RW & RT nanti</li>
              </ul>
            </div>

            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep("role")} className="h-11 flex-1 rounded-xl border-[#d9e6dd] font-bold text-[#4e6e63]">Kembali</Button>
              <Button onClick={handleRegister} disabled={loading || !desaName.trim()} className="h-11 flex-1 rounded-xl bg-[#173b33] font-bold text-white hover:bg-[#255649]">
                {loading ? "Memproses..." : "Daftar"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== REGISTER STEP: BUAT RW BARU ==========
  if (step === "rw") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f8f5] px-5">
        <div className="w-full max-w-md rounded-[28px] border border-[#dfe9e2] bg-white p-8 shadow-[0_20px_60px_rgba(44,72,57,0.08)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#173b33] text-[#f7d58e]">
            <span className="h-5 w-5 rounded-full border-[3px] border-[#f7d58e]" />
          </div>
          <h1 className="mt-6 text-center text-2xl font-semibold tracking-[-0.04em] text-[#173b33]">Buat RW Baru</h1>
          <p className="mt-3 text-center text-sm leading-6 text-[#71827b]">Pilih desa, lalu masukkan data RW.</p>

          <div className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#345b4e]">Nama Desa / Kelurahan</Label>
              {orgsLoading ? (
                <div className="h-11 animate-pulse rounded-xl bg-[#f0f4f1]" />
              ) : (
                <select value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)} className="h-11 w-full rounded-xl border border-[#d9e6dd] bg-white px-4 text-sm text-[#345b4e] outline-none focus:ring-2 focus:ring-[#4d9177]">
                  <option value="">Pilih desa/kelurahan</option>
                  {orgs?.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#345b4e]">Nomor RW</Label>
              <Input placeholder="contoh: 04" value={rwCode} onChange={(e) => setRwCode(e.target.value)} className="h-11 rounded-xl border-[#d9e6dd] bg-white px-4 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#345b4e]">Nama RW</Label>
              <Input placeholder="contoh: RW 04" value={rwName} onChange={(e) => setRwName(e.target.value)} className="h-11 rounded-xl border-[#d9e6dd] bg-white px-4 text-sm" />
            </div>
            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep("role")} className="h-11 flex-1 rounded-xl border-[#d9e6dd] font-bold text-[#4e6e63]">Kembali</Button>
              <Button onClick={handleRegister} disabled={loading || !selectedOrgId || !rwName.trim() || !rwCode.trim()} className="h-11 flex-1 rounded-xl bg-[#173b33] font-bold text-white hover:bg-[#255649]">
                {loading ? "Memproses..." : "Daftar"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== REGISTER STEP: BUAT RT BARU ==========
  if (step === "rt") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f8f5] px-5">
        <div className="w-full max-w-md rounded-[28px] border border-[#dfe9e2] bg-white p-8 shadow-[0_20px_60px_rgba(44,72,57,0.08)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#173b33] text-[#f7d58e]">
            <span className="h-5 w-5 rounded-full border-[3px] border-[#f7d58e]" />
          </div>
          <h1 className="mt-6 text-center text-2xl font-semibold tracking-[-0.04em] text-[#173b33]">Buat RT Baru</h1>
          <p className="mt-3 text-center text-sm leading-6 text-[#71827b]">Pilih desa & RW, lalu masukkan data RT.</p>

          <div className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#345b4e]">Pilih Desa / Kelurahan</Label>
              {orgsLoading ? (
                <div className="h-11 animate-pulse rounded-xl bg-[#f0f4f1]" />
              ) : (
                <select value={selectedOrgId} onChange={(e) => { setSelectedOrgId(e.target.value); setSelectedRwId(""); }} className="h-11 w-full rounded-xl border border-[#d9e6dd] bg-white px-4 text-sm text-[#345b4e] outline-none focus:ring-2 focus:ring-[#4d9177]">
                  <option value="">Pilih desa/kelurahan</option>
                  {orgs?.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#345b4e]">Pilih RW</Label>
              {rwLoading ? (
                <div className="h-11 animate-pulse rounded-xl bg-[#f0f4f1]" />
              ) : (
                <select value={selectedRwId} onChange={(e) => setSelectedRwId(e.target.value)} className="h-11 w-full rounded-xl border border-[#d9e6dd] bg-white px-4 text-sm text-[#345b4e] outline-none focus:ring-2 focus:ring-[#4d9177]" disabled={!selectedOrgId}>
                  <option value="">Pilih RW</option>
                  {rwList?.map(rw => (
                    <option key={rw.id} value={rw.id}>{rw.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#345b4e]">Nomor RT</Label>
              <Input placeholder="contoh: 07" value={rtCode} onChange={(e) => setRtCode(e.target.value)} className="h-11 rounded-xl border-[#d9e6dd] bg-white px-4 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#345b4e]">Nama RT</Label>
              <Input placeholder="contoh: RT 07" value={rtName} onChange={(e) => setRtName(e.target.value)} className="h-11 rounded-xl border border-[#d9e6dd] bg-white px-4 text-sm" />
            </div>
            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep("role")} className="h-11 flex-1 rounded-xl border-[#d9e6dd] font-bold text-[#4e6e63]">Kembali</Button>
              <Button onClick={handleRegister} disabled={loading || !selectedRwId || !rtName.trim() || !rtCode.trim()} className="h-11 flex-1 rounded-xl bg-[#173b33] font-bold text-white hover:bg-[#255649]">
                {loading ? "Memproses..." : "Daftar"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== REGISTER STEP: WARGA - JOIN RT/RW ==========
  if (step === "warga") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f8f5] px-5">
        <div className="w-full max-w-md rounded-[28px] border border-[#dfe9e2] bg-white p-8 shadow-[0_20px_60px_rgba(44,72,57,0.08)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#173b33] text-[#f7d58e]">
            <span className="h-5 w-5 rounded-full border-[3px] border-[#f7d58e]" />
          </div>
          <h1 className="mt-6 text-center text-2xl font-semibold tracking-[-0.04em] text-[#173b33]">Pilih Wilayah</h1>
          <p className="mt-3 text-center text-sm leading-6 text-[#71827b]">Pilih RT/RW yang ingin kamu ikuti.</p>

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#345b4e]">Pilih Desa / Kelurahan</Label>
              {orgsLoading ? (
                <div className="h-11 animate-pulse rounded-xl bg-[#f0f4f1]" />
              ) : (
                <select value={selectedOrgId} onChange={(e) => { setSelectedOrgId(e.target.value); setSelectedJoinOrgId(""); }} className="h-11 w-full rounded-xl border border-[#d9e6dd] bg-white px-4 text-sm text-[#345b4e] outline-none focus:ring-2 focus:ring-[#4d9177]">
                  <option value="">Pilih desa/kelurahan</option>
                  {orgs?.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              )}
            </div>

            {selectedOrgId && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#345b4e]">Pilih RW</Label>
                {rwLoading ? (
                  <div className="h-11 animate-pulse rounded-xl bg-[#f0f4f1]" />
                ) : (
                  <select value={selectedRwId} onChange={(e) => { setSelectedRwId(e.target.value); setSelectedJoinOrgId(""); }} className="h-11 w-full rounded-xl border border-[#d9e6dd] bg-white px-4 text-sm text-[#345b4e] outline-none focus:ring-2 focus:ring-[#4d9177]">
                    <option value="">Pilih RW</option>
                    {rwList?.map(rw => (
                      <option key={rw.id} value={rw.id}>{rw.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {selectedRwId && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#345b4e]">Pilih RT</Label>
                <div className="max-h-[200px] space-y-2 overflow-y-auto">
                  {rwList?.filter(rw => rw.id === selectedRwId).map(rw => (
                    <div key={rw.id}>
                      {rw.rts && rw.rts.length > 0 ? (
                        rw.rts.map(rt => (
                          <button
                            key={rt.id}
                            onClick={() => { setSelectedJoinOrgId(selectedOrgId); setSelectedJoinRtId(rt.id); }}
                            className={`w-full rounded-xl border-2 px-4 py-3 text-left transition-all ${
                              selectedJoinRtId === rt.id
                                ? "border-[#173b33] bg-[#f0f7f2]"
                                : "border-[#dce8df] bg-white hover:border-[#b8d4c2]"
                            }`}
                          >
                            <p className="text-sm font-semibold text-[#173b33]">{rt.name}</p>
                          </button>
                        ))
                      ) : (
                        <p className="py-2 text-center text-xs text-[#71827b]">Belum ada RT di RW ini</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep("role")} className="h-11 flex-1 rounded-xl border-[#d9e6dd] font-bold text-[#4e6e63]">Kembali</Button>
              <Button onClick={handleRegister} disabled={loading || !selectedJoinOrgId || !selectedJoinRtId} className="h-11 flex-1 rounded-xl bg-[#173b33] font-bold text-white hover:bg-[#255649]">
                {loading ? "Memproses..." : "Daftar"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
