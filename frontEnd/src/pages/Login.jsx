import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Store, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import useAuthStore from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(formData.email, formData.password);
      toast.success("Welcome back!");
      // Redirect based on role - get profile from localStorage or wait for it
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile?.role === "admin") {
          navigate("/dashboard");
        } else {
          navigate("/cashier");
        }
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* Fixed Header - Back to Home */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-dark-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </header>

      {/* Main Content - Centered */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          {/* Logo Section - Perfectly Centered */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/30">
                <Store className="h-7 w-7 text-white" />
              </div>
            </Link>
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-dark-400 mt-2 text-sm">
              Sign in to your account to continue
            </p>
          </div>

          {/* Login Form Card */}
          <div className="bg-dark-900/50 border border-dark-800 rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="name@company.com"
                icon={Mail}
                value={formData.email}
                onChange={handleChange}
                required
              />

              <div className="relative">
                <Input
                  label="Password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  icon={Lock}
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-dark-500 hover:text-dark-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <Button
                type="submit"
                loading={loading}
                className="w-full"
                size="lg"
              >
                Sign In
              </Button>
            </form>
          </div>

          {/* Footer Links */}
          <div className="mt-6 text-center">
            <p className="text-sm text-dark-500">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
              >
                Create one
              </Link>
            </p>
          </div>

          {/* Copyright */}
          <p className="text-center text-dark-600 text-xs mt-8">
            © {new Date().getFullYear()} KasirPOS. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
