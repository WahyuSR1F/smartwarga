import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { trpc } from "@/lib/trpc";
import { useIsMobile } from "@/hooks/useMobile";
import { CalendarDays, FileText, LayoutDashboard, LogOut, Megaphone, PanelLeft, UserPlus, UsersRound, WalletCards } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { organizationPath, selectActiveMembership } from "@/lib/active-membership";

const menuItems = [
  { icon: LayoutDashboard, label: "Ringkasan", path: "/app" },
  { icon: UsersRound, label: "Data warga", path: "/app/warga", roles: ["platform_admin", "organization_admin", "rw_admin", "rt_admin"] },
  { icon: WalletCards, label: "Tagihan", path: "/app/tagihan", roles: ["platform_admin", "organization_admin", "rw_admin", "rt_admin", "treasurer", "resident"] },
  { icon: CalendarDays, label: "Acara", path: "/app/acara", roles: ["platform_admin", "organization_admin", "rw_admin", "rt_admin", "resident"] },
  { icon: Megaphone, label: "Pengumuman", path: "/app/pengumuman", roles: ["platform_admin", "organization_admin", "rw_admin", "rt_admin", "resident"] },
  { icon: Megaphone, label: "Donasi", path: "/app/donasi", roles: ["platform_admin", "organization_admin", "rw_admin", "rt_admin", "treasurer", "resident"] },
  { icon: FileText, label: "Forum warga", path: "/app/forum", roles: ["platform_admin", "organization_admin", "rw_admin", "rt_admin", "resident"] },
  { icon: UserPlus, label: "Join Wilayah", path: "/app/join-wilayah" },
  { icon: UsersRound, label: "Permintaan Join", path: "/app/join-requests", roles: ["platform_admin", "organization_admin", "rw_admin", "rt_admin"] },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 272;
const MIN_WIDTH = 220;
const MAX_WIDTH = 420;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const { loading, user } = useAuth();

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    const parsed = saved ? Number.parseInt(saved, 10) : DEFAULT_WIDTH;
    if (Number.isFinite(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) setSidebarWidth(parsed);
  }, []);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f8f8f5] px-5"><div className="w-full max-w-md rounded-[28px] border border-[#dfe9e2] bg-white p-8 text-center shadow-[0_20px_60px_rgba(44,72,57,0.08)]"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#173b33] text-[#f7d58e]"><span className="h-5 w-5 rounded-full border-[3px] border-[#f7d58e]" /></div><h1 className="mt-6 text-2xl font-semibold tracking-[-0.04em] text-[#173b33]">Masuk ke ruang warga</h1><p className="mt-3 text-sm leading-6 text-[#71827b]">Akses dashboard administrasi membutuhkan autentikasi agar data lingkungan tetap terlindungi.</p><Button onClick={() => { window.location.href = "/login"; }} className="mt-7 h-11 w-full rounded-xl bg-[#173b33] font-bold text-white hover:bg-[#255649]">Masuk dengan aman</Button></div></div>;
  }

  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent></SidebarProvider>;
}

type DashboardLayoutContentProps = { children: React.ReactNode; setSidebarWidth: (width: number) => void };

function DashboardLayoutContent({ children, setSidebarWidth }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { data: memberships, isError: membershipsError } = trpc.community.organizations.useQuery(undefined, { enabled: Boolean(user) });
  const [location, setLocation] = useLocation();
  const pathname = location.split("?")[0] ?? "/app";
  const requestedOrganizationId = new URLSearchParams(location.split("?")[1] ?? "").get("organization") ?? undefined;
  const activeMembership = selectActiveMembership(memberships, requestedOrganizationId);
  const membershipRole = activeMembership?.membership.role ?? (user?.role === "platform_admin" ? "platform_admin" : "resident");
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const visibleMenuItems = menuItems.filter(item => !item.roles || item.roles.includes(membershipRole));
  const activeMenuItem = visibleMenuItems.find(item => item.path === pathname) ?? visibleMenuItems[0] ?? menuItems[0];

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const nextWidth = event.clientX - sidebarLeft;
      if (nextWidth >= MIN_WIDTH && nextWidth <= MAX_WIDTH) setSidebarWidth(nextWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return <><div ref={sidebarRef} className="relative"><Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}><SidebarHeader className="h-[76px] justify-center border-b border-[#dce8df] px-3"><div className="flex w-full items-center gap-3"><button onClick={toggleSidebar} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#527168] transition-colors hover:bg-[#eaf2ec] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4d9177]" aria-label="Toggle navigation"><PanelLeft className="h-4 w-4" /></button>{!isCollapsed && <div className="min-w-0"><p className="truncate text-sm font-bold tracking-[-0.02em] text-[#173b33]">smart warga</p><p className="mt-1 truncate text-[9px] font-bold uppercase tracking-[0.18em] text-[#8ca198]">ruang bersama</p></div>}</div></SidebarHeader><SidebarContent className="gap-0 bg-[#f3f8f4]"><div className="px-4 pb-2 pt-6 group-data-[collapsible=icon]:hidden"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#98aaa0]">Menu utama</p></div><SidebarMenu className="gap-1 px-2 py-1">{visibleMenuItems.map(item => { const isActive = item.path === "/app" ? pathname === "/app" : pathname.startsWith(item.path); return <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={isActive} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-11 rounded-xl px-3 font-medium text-[#658077] transition-colors data-[active=true]:bg-[#dcece2] data-[active=true]:text-[#1f6a55] data-[active=true]:shadow-sm"><item.icon className={`h-[17px] w-[17px] ${isActive ? "text-[#287456]" : ""}`} /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>; })}</SidebarMenu><div className="mt-auto px-4 pb-5 pt-10 group-data-[collapsible=icon]:hidden"><div className="rounded-2xl border border-[#d8e7dc] bg-white/80 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#a0b1a7]">Wilayah aktif</p><p className="mt-2 text-sm font-semibold text-[#345b4e]">RW 04 · RT 07</p>{memberships && memberships.length > 1 ? <select aria-label="Pilih wilayah aktif" value={activeMembership?.organization.id ?? ""} onChange={event => setLocation(organizationPath(pathname, event.target.value))} className="mt-1 w-full truncate bg-transparent text-left text-[11px] text-[#8ba096] outline-none">{memberships.map(item => <option key={item.organization.id} value={item.organization.id}>{item.organization.name}</option>)}</select> : <p className="mt-1 truncate text-[11px] text-[#8ba096]">{activeMembership?.organization.name ?? "Belum memilih wilayah"}</p>}</div></div></SidebarContent><SidebarFooter className="border-t border-[#dce8df] bg-[#f3f8f4] p-3"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4d9177] group-data-[collapsible=icon]:justify-center"><Avatar className="h-9 w-9 shrink-0 border border-[#cfe0d5] bg-[#e4f0e8]"><AvatarFallback className="bg-[#e4f0e8] text-xs font-bold text-[#34785e]">{user?.name?.charAt(0).toUpperCase() || "W"}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-xs font-bold text-[#35584d]">{user?.name || "Warga"}</p><p className="mt-1 truncate text-[10px] text-[#8ca198]">{user?.email || "Akun komunitas"}</p></div></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48 rounded-xl border-[#dce8df]"><DropdownMenuItem onClick={logout} className="cursor-pointer rounded-lg text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" /> Keluar</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter></Sidebar><div className={`absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-[#4d9177]/20 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => !isCollapsed && setIsResizing(true)} style={{ zIndex: 50 }} /></div><SidebarInset className="bg-[#f8f8f5]"><div className="sticky top-0 z-40 flex h-[76px] items-center justify-between border-b border-[#e1ebe4] bg-[#f8f8f5]/90 px-4 backdrop-blur-xl sm:px-6"><div className="flex items-center gap-3">{isMobile && <SidebarTrigger className="h-9 w-9 rounded-xl bg-white text-[#47675d]" />}<div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a6e2e]">{activeMembership?.organization.name ?? "Ruang warga"}</p><p className="mt-1 text-sm font-semibold text-[#284e42]">{activeMenuItem.label}</p></div></div><div className="flex items-center gap-2"><span className="hidden rounded-full bg-[#e6f2ea] px-3 py-1.5 text-[10px] font-bold text-[#438367] sm:inline-flex">● Sistem aktif</span><Button variant="outline" className="h-9 rounded-xl border-[#d9e6dd] bg-white px-3 text-xs font-bold text-[#4e6e63] hover:bg-[#f3f7f4]"><span className="mr-2 h-2 w-2 rounded-full bg-[#56a278]" /> Bantuan</Button></div></div>{membershipsError && <div role="alert" className="border-b border-[#f0d7cf] bg-[#fff8f5] px-4 py-3 text-xs text-[#9b5c49] sm:px-6 lg:px-8">Wilayah aktif belum dapat dimuat. Coba muat ulang halaman.</div>}<main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main></SidebarInset></>;
}
