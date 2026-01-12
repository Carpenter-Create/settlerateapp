import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/admin/AdminRoute";

// Public pages
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import ResetPasswordConfirm from "./pages/ResetPasswordConfirm";
import NotFound from "./pages/NotFound";

// App pages
import ScenariosIndex from "./pages/app/ScenariosIndex";
import ScenarioDetail from "./pages/app/ScenarioDetail";
import Calculator from "./pages/app/Calculator";
import Account from "./pages/app/Account";
import AppSettings from "./pages/app/Settings";
import AdvisorRequest from "./pages/app/AdvisorRequest";

// Admin pages
import AdvisorRequestsAdmin from "./pages/admin/AdvisorRequestsNew";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Auth />} />
            <Route path="/sign-up" element={<Navigate to="/?mode=create" replace />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/reset-password/confirm" element={<ResetPasswordConfirm />} />

            {/* Protected app routes */}
            <Route path="/app" element={<Navigate to="/app/scenarios" replace />} />
            <Route path="/app/scenarios" element={<ProtectedRoute><AppLayout><ScenariosIndex /></AppLayout></ProtectedRoute>} />
            <Route path="/app/scenarios/:id" element={<ProtectedRoute><AppLayout><ScenarioDetail /></AppLayout></ProtectedRoute>} />
            <Route path="/app/calculator" element={<ProtectedRoute><AppLayout><Calculator /></AppLayout></ProtectedRoute>} />
            <Route path="/app/account" element={<ProtectedRoute><AppLayout><Account /></AppLayout></ProtectedRoute>} />
            <Route path="/app/settings" element={<ProtectedRoute><AppLayout><AppSettings /></AppLayout></ProtectedRoute>} />
            <Route path="/app/advisor-request" element={<ProtectedRoute><AdvisorRequest /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin/advisor-requests" element={<AdminRoute><AdvisorRequestsAdmin /></AdminRoute>} />
            <Route path="/app/admin/advisors" element={<AdminRoute><AdvisorRequestsAdmin /></AdminRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
