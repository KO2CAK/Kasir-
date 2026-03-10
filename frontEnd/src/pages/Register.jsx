import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Store, Mail, Lock, Eye, EyeOff, User, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import useAuthStore from "@/stores/authStore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const Register = () => {
  const navigate = useNavigate();
  const { signUp } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // Always register as admin - cashiers are added by admin later
      const data = await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        "admin",
      );

      // Check if user was created but needs email confirmation
      if (
        data?.user &&
        data?.user.identities &&
        data.user.identities.length === 0
      ) {
        toast.error(
          "An account with this email already exists but is not verified. Please check your email for the confirmation link, or try logging in.",
        );
      } else if (data?.session) {
        toast.success("Account created successfully! Welcome!");
        navigate("/dashboard");
      } else {
        toast.success(
          "Account created! Please check your email to verify your account.",
          { duration: 5000 },
        );
        navigate("/login");
      }
    } catch (error) {
      toast.error(error.message || "Failed to create account");
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
      <main className="flex-1 flex items-center justify-center px-4 py-16 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Logo Section - Perfectly Centered */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/30">
                <Store className="h-7 w-7 text-white" />
              </div>
            </Link>
            <h1 className="text-2xl font-bold text-white">
              Create your account
            </h1>
            <p className="text-dark-400 mt-2 text-sm">
              Start managing your business today
            </p>
          </div>

          {/* Register Form Card */}
          <div className="bg-dark-900/50 border border-dark-800 rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Full Name"
                name="fullName"
                type="text"
                placeholder="John Doe"
                icon={User}
                value={formData.fullName}
                onChange={handleChange}
                required
              />

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
                  placeholder="Min. 6 characters"
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

              <Input
                label="Confirm Password"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                icon={Lock}
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />

              <Button
                type="submit"
                loading={loading}
                className="w-full"
                size="lg"
              >
                Create Account
              </Button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-dark-500">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
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

export default Register;
