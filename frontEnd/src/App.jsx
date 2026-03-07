import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import useAuthStore from "@/stores/authStore";
import useShiftStore from "@/stores/shiftStore";
import MainLayout from "@/layouts/MainLayout";
import LandingPage from "@/pages/LandingPage";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Cashier from "@/pages/Cashier";
import Inventory from "@/pages/Inventory";
import Transactions from "@/pages/Transactions";
import Settings from "@/pages/Settings";
import Expenses from "@/pages/Expenses";
import Reports from "@/pages/Reports";
import NotFound from "@/pages/NotFound";
import ShiftModal from "@/components/ShiftModal";

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route wrapper (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const App = () => {
  const { initialize, user } = useAuthStore();
  const { fetchCurrentShift, currentShift } = useShiftStore();
  const [shiftModalOpen, setShiftModalOpen] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Check for open shift on user login
  useEffect(() => {
    if (user) {
      fetchCurrentShift(user.id).then(() => {
        // If no open shift, show the modal
        const shift = useShiftStore.getState().currentShift;
        if (!shift) {
          setShiftModalOpen(true);
        }
      });
    }
  }, [user, fetchCurrentShift]);

  const handleShiftOpened = () => {
    setShiftModalOpen(false);
  };

  return (
    <Router>
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#1e293b",
            color: "#e2e8f0",
            border: "1px solid #334155",
            borderRadius: "12px",
            fontSize: "14px",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />

      {/* Global Shift Modal - Show if no open shift */}
      <ShiftModal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        onShiftOpened={handleShiftOpened}
      />

      <Routes>
        {/* Landing Page - Public (redirects to dashboard if logged in) */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          }
        />

        {/* Auth Routes - Public (redirects to dashboard if logged in) */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Protected Routes - All require authentication */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cashier" element={<Cashier />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default App;
