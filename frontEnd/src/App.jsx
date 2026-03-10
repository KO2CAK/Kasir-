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
import Users from "@/pages/Users";
import NotFound from "@/pages/NotFound";
import ShiftModal from "@/components/ShiftModal";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuthStore();
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { profile, loading } = useAuthStore();
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!profile || profile.role !== "admin") {
    return <Navigate to="/cashier" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, profile, loading } = useAuthStore();
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (user) {
    // Redirect based on role
    if (profile?.role === "admin") {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/cashier" replace />;
  }
  return children;
};

const App = () => {
  const { initialize, user } = useAuthStore();
  const { fetchCurrentShift } = useShiftStore();
  const [shiftModalOpen, setShiftModalOpen] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user) {
      fetchCurrentShift(user.id).then(() => {
        const shift = useShiftStore.getState().currentShift;
        if (!shift) setShiftModalOpen(true);
      });
    }
  }, [user, fetchCurrentShift]);

  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#1e293b",
            color: "#e2e8f0",
            border: "1px solid #334155",
            borderRadius: "12px",
          },
        }}
      />
      <ShiftModal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        onShiftOpened={() => setShiftModalOpen(false)}
      />
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          }
        />
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
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={
              <AdminRoute>
                <Dashboard />
              </AdminRoute>
            }
          />
          <Route path="/cashier" element={<Cashier />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/users" element={<Users />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default App;
