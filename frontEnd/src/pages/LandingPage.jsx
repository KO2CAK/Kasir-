import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Package,
  Shield,
  Users,
  BarChart3,
  Store,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import useAuthStore from "@/stores/authStore";

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuthStore();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const features = [
    {
      icon: Package,
      title: "Inventory Master",
      description: "Smart alerts when stock is low.",
    },
    {
      icon: Shield,
      title: "Secure Shifts",
      description: "Track every cent from open to close.",
    },
    {
      icon: Users,
      title: "Customer Loyalty",
      description: "Simple membership system for repeat buyers.",
    },
    {
      icon: BarChart3,
      title: "Owner Insights",
      description: "Profit analytics that actually make sense.",
    },
  ];

  const socialProofs = [
    { name: "Toko Berkah", location: "Balikpapan" },
    { name: "Minimarket Sejahtera", location: "Balikpapan" },
    { name: "Toko Sumber Rejeki", location: "Balikpapan" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Store className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                Kasir<span className="text-emerald-600">POS</span>
              </span>
            </div>

            {/* Nav Buttons */}
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 lg:py-32 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full mb-8">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              Trusted by 500+ local shops
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Master Your Retail Business
            <br />
            <span className="text-emerald-600">in One Click</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Inventory, Shifts, and Real-time Profits — all in one powerful POS
            system designed for local businesses.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              View Demo
            </Link>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 relative">
            <div className="mx-auto max-w-5xl">
              <div className="relative rounded-2xl bg-gray-900 p-2 shadow-2xl">
                <div className="rounded-xl bg-gray-800 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-b border-gray-700">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="p-6 bg-gray-800 min-h-[300px] flex items-center justify-center">
                    <div className="text-center">
                      <Store className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
                      <p className="text-gray-400">
                        Modern POS Dashboard Preview
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-sm font-medium text-gray-500 mb-8">
            Trusted by local shops in Balikpapan
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {socialProofs.map((shop, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-gray-700"
              >
                <Store className="h-5 w-5 text-emerald-600" />
                <span className="font-medium">{shop.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful features designed specifically for local retail
              businesses
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-white border border-gray-200 rounded-xl hover:border-emerald-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-emerald-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-lg text-emerald-100 mb-8">
            Join hundreds of local shops already using KasirPOS
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-emerald-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Get Started for Free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Store className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">
              Kasir<span className="text-emerald-400">POS</span>
            </span>
          </div>
          <p className="text-sm text-gray-400">
            © 2024 KasirPOS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
