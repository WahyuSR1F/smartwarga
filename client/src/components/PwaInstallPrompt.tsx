import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

interface DeferredPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallPrompt() {
  const [prompt, setPrompt] = useState<DeferredPrompt | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    if (isStandalone) return;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);
    const handleInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as DeferredPrompt);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handleInstall);
    if (ios) setVisible(true);
    return () => window.removeEventListener("beforeinstallprompt", handleInstall);
  }, []);

  if (!visible) return null;

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
    setVisible(false);
  };

  return <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-[#d7e6dc] bg-white p-4 shadow-[0_18px_60px_rgba(25,65,49,0.16)]"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#173b33] text-[#f4cc78]"><Download className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#274d40]">Pasang Smart Warga</p><p className="mt-1 text-[11px] leading-5 text-[#789087]">{isIOS ? "Gunakan Bagikan lalu pilih Tambahkan ke Layar Utama." : "Simpan ruang warga di layar utama untuk akses yang lebih cepat."}</p>{!isIOS && <Button onClick={install} className="mt-3 h-8 rounded-lg bg-[#173b33] px-3 text-[11px] font-bold text-white hover:bg-[#255649]">Pasang sekarang</Button>}</div><button onClick={() => setVisible(false)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#98aaa0] hover:bg-[#f1f6f2]" aria-label="Tutup panduan instalasi"><X className="h-4 w-4" /></button></div>;
}
