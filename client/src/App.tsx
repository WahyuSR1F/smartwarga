import { Toaster } from "@/components/ui/sonner";
import { lazy, Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Router as WouterRouter, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import PwaInstallPrompt from "./components/PwaInstallPrompt";
import { ThemeProvider } from "./contexts/ThemeContext";

const NotFound = lazy(() => import("@/pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Home = lazy(() => import("./pages/Home"));
const PublicInfoPage = lazy(() => import("./pages/PublicInfoPage"));
const DashboardLayout = lazy(() => import("./components/DashboardLayout"));
const CommunityDashboard = lazy(() => import("./pages/CommunityDashboard"));
const JoinWilayah = lazy(() => import("./pages/JoinWilayah"));
const JoinRequests = lazy(() => import("./pages/JoinRequests"));
const WorkspacePage = lazy(() => import("./pages/WorkspacePage"));

function RouteLoading() {
  return <div className="flex min-h-[50vh] items-center justify-center text-sm text-[#789087]">Memuat ruang warga...</div>;
}

function Router({ ssrPath, ssrSearch }: { ssrPath?: string; ssrSearch?: string }) {
  return (
    <Suspense fallback={<RouteLoading />}>
      <WouterRouter ssrPath={ssrPath} ssrSearch={ssrSearch}>
      <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Home} />
      <Route path="/wilayah/:slug" component={PublicInfoPage} />
      <Route path="/acara/:slug" component={PublicInfoPage} />
      <Route path="/donasi/:slug" component={PublicInfoPage} />
      <Route path="/pengumuman/:slug" component={PublicInfoPage} />
      <Route path="/app">
        <DashboardLayout>
          <CommunityDashboard />
        </DashboardLayout>
      </Route>
      <Route path="/app/join-wilayah">
        <DashboardLayout>
          <JoinWilayah />
        </DashboardLayout>
      </Route>
      <Route path="/app/join-requests">
        <DashboardLayout>
          <JoinRequests />
        </DashboardLayout>
      </Route>
      <Route path="/app/:section">
        <DashboardLayout>
          <WorkspacePage />
        </DashboardLayout>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
      </Switch>
      </WouterRouter>
    </Suspense>
  );
}

function App({ ssrPath, ssrSearch }: { ssrPath?: string; ssrSearch?: string }) {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router ssrPath={ssrPath} ssrSearch={ssrSearch} />
          <PwaInstallPrompt />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
