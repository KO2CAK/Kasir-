import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Search, AlertTriangle, Clock, Package, X } from "lucide-react";
import useAuthStore from "@/stores/authStore";
import useNotificationStore from "@/stores/notificationStore";

const pageTitles = {
  "/": "Dashboard",
  "/cashier": "Cashier",
  "/inventory": "Inventory Management",
  "/transactions": "Transaction History",
};

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const {
    notifications,
    unreadCount,
    isOpen,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    toggleDropdown,
    closeDropdown,
  } = useNotificationStore();

  const dropdownRef = useRef(null);

  const currentTitle = pageTitles[location.pathname] || "Page";

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();

    // Refresh notifications every 60 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    if (notification.type === "low_stock") {
      navigate("/inventory");
    }
    closeDropdown();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "low_stock":
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case "shift_opened":
        return <Clock className="h-4 w-4 text-blue-400" />;
      default:
        return <Package className="h-4 w-4 text-dark-400" />;
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-dark-900/80 backdrop-blur-xl border-b border-dark-800">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left: Page Title */}
        <div>
          <h2 className="text-xl font-bold text-dark-100">{currentTitle}</h2>
          <p className="text-xs text-dark-500">
            {getGreeting()}, {profile?.full_name || "User"}
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
            <input
              type="text"
              placeholder="Search..."
              className="w-64 pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all"
            />
          </div>

          {/* Notifications */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={toggleDropdown}
              className="relative p-2 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-800 transition-colors"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isOpen && (
              <div className="absolute right-0 top-12 w-80 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700 bg-dark-900/50">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-dark-100">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={closeDropdown}
                      className="p-1 text-dark-400 hover:text-dark-200 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Notification List */}
                <div className="max-h-80 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Bell className="h-10 w-10 text-dark-600 mb-2" />
                      <p className="text-sm text-dark-400">No notifications</p>
                      <p className="text-xs text-dark-500 mt-1">
                        You're all caught up!
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-dark-700/50">
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-dark-700/50 transition-colors text-left ${
                            !notification.read ? "bg-dark-700/30" : ""
                          }`}
                        >
                          <div
                            className={`p-2 rounded-lg ${
                              notification.type === "low_stock"
                                ? "bg-amber-500/10"
                                : "bg-blue-500/10"
                            }`}
                          >
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium ${
                                !notification.read
                                  ? "text-dark-100"
                                  : "text-dark-300"
                              }`}
                            >
                              {notification.title}
                            </p>
                            <p className="text-xs text-dark-500 mt-0.5 truncate">
                              {notification.message}
                            </p>
                            <p className="text-[10px] text-dark-600 mt-1">
                              {formatTimeAgo(notification.created_at)}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary-500 rounded-full mt-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="px-4 py-2 border-t border-dark-700 bg-dark-900/30">
                    <button
                      onClick={() => {
                        navigate("/inventory");
                        closeDropdown();
                      }}
                      className="w-full text-center text-xs text-primary-400 hover:text-primary-300 transition-colors py-1"
                    >
                      View all alerts →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Avatar */}
          <div className="flex items-center gap-3 pl-3 border-l border-dark-700">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-600/20">
              <span className="text-sm font-bold text-white">
                {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-dark-200">
                {profile?.full_name || "User"}
              </p>
              <p className="text-[10px] text-primary-400 uppercase tracking-wider font-semibold">
                {profile?.role || "cashier"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
