import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/admin/AdminRoute";

// Public pages
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// App pages
import AppIndex from "./pages/app/Index";
import Calculator from "./pages/app/Calculator";
import Account from "./pages/app/Account";
import AppSettings from "./pages/app/Settings";

// Admin pages
import AdvisorRequests from "./pages/admin/AdvisorRequests";

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

            {/* Protected app routes */}
            <Route path="/app" element={<ProtectedRoute><AppLayout><AppIndex /></AppLayout></ProtectedRoute>} />
            <Route path="/app/calculator" element={<ProtectedRoute><AppLayout><Calculator /></AppLayout></ProtectedRoute>} />
            <Route path="/app/account" element={<ProtectedRoute><AppLayout><Account /></AppLayout></ProtectedRoute>} />
            <Route path="/app/settings" element={<ProtectedRoute><AppLayout><AppSettings /></AppLayout></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin/advisor-requests" element={<AdminRoute><AdvisorRequests /></AdminRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
