import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Store,
  Wallet,
  BarChart3,
  Users,
} from "lucide-react";
import useAuthStore from "@/stores/authStore";

const adminNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Cashier", href: "/cashier", icon: ShoppingCart },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Transactions", href: "/transactions", icon: Receipt },
  { name: "Expenses", href: "/expenses", icon: Wallet },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Users", href: "/users", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

const cashierNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Cashier", href: "/cashier", icon: ShoppingCart },
  { name: "Transactions", href: "/transactions", icon: Receipt },
];

const Sidebar = ({ collapsed, setCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuthStore();

  const isAdmin = profile && profile.role === "admin";
  const navigation = isAdmin ? adminNavigation : cashierNavigation;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen bg-dark-950 border-r border-dark-800 transition-all duration-300 ease-in-out flex flex-col ${collapsed ? "w-[72px]" : "w-64"}`}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-dark-800">
        <div className="flex-shrink-0 w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/20">
          <Store className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold text-white tracking-tight">
              Kasir<span className="text-primary-400">POS</span>
            </h1>
            <p className="text-[10px] text-dark-500 uppercase tracking-widest">
              Point of Sale
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${isActive ? "bg-primary-600/10 text-primary-400" : "text-dark-400 hover:bg-dark-800/60 hover:text-dark-200"}`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-500 rounded-r-full" />
              )}
              <item.icon
                className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-primary-400" : "text-dark-500 group-hover:text-dark-300"}`}
              />
              {!collapsed && (
                <span className="text-sm font-medium truncate">
                  {item.name}
                </span>
              )}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-xs font-medium text-dark-200 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl z-50">
                  {item.name}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-dark-800">
        {!collapsed && profile && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-600/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary-400">
                {profile.full_name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-dark-200 truncate">
                {profile.full_name || "User"}
              </p>
              <p className="text-[10px] text-dark-500 uppercase tracking-wider">
                {profile.role || "cashier"}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-dark-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
        </button>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-dark-800 border border-dark-700 rounded-full flex items-center justify-center text-dark-400 hover:text-dark-200 hover:bg-dark-700 transition-colors shadow-lg"
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>
    </aside>
  );
};

export default Sidebar;
