import { useState } from "react";

export default function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<{ role: string; text: string }[]>([
    { role: "bot", text: "Hi! Ada yang bisa kami bantu?" },
  ]);

  const send = () => {
    if (!text.trim()) return;
    setMsgs((m) => [...m, { role: "user", text }]);
    setText("");
    setTimeout(() => setMsgs((m) => [...m, { role: "bot", text: "Terima kasih, pesan diterima." }]), 600);
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-[2147483000] grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg hover:scale-105 transition"
        aria-label="Buka chat"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-[2147483001] flex h-[520px] w-[360px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-[#25D366] px-4 py-3 text-white">
            <div>
              <p className="font-semibold">Support Chat</p>
              <p className="text-xs opacity-90">Online</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-xl leading-none">×</button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 bg-gray-50">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "ml-auto bg-[#25D366] text-white" : "bg-white border"}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t p-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Tulis pesan…"
              className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#25D366]"
            />
            <button onClick={send} className="rounded-lg bg-[#25D366] px-3 py-2 text-sm text-white">
              Kirim
            </button>
          </div>
        </div>
      )}
    </>
  );
}
