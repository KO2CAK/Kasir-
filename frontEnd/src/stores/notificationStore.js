import { create } from "zustand";
import { supabase } from "@/lib/supabase";

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,
  loading: false,

  // Fetch notifications (low stock + recent shift opened)
  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const notifications = [];
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

      // Fetch low stock products (< 10)
      const { data: lowStockProducts, error: stockError } = await supabase
        .from("products")
        .select("id, name, sku, stock, price, categories(name)")
        .lt("stock", 10)
        .eq("is_active", true)
        .order("stock", { ascending: true });

      if (stockError) throw stockError;

      // Add low stock notifications
      if (lowStockProducts && lowStockProducts.length > 0) {
        lowStockProducts.forEach((product) => {
          notifications.push({
            id: `low-stock-${product.id}`,
            type: "low_stock",
            title: product.stock === 0 ? "Out of Stock" : "Low Stock",
            message:
              product.stock === 0
                ? `${product.name} is out of stock!`
                : `${product.name} has only ${product.stock} left`,
            product: product,
            read: false,
            created_at: new Date().toISOString(),
          });
        });
      }

      // Fetch recent shift openings (last 1 hour)
      const { data: recentShifts, error: shiftError } = await supabase
        .from("shifts")
        .select("id, start_time, profiles(full_name)")
        .gte("start_time", oneHourAgo)
        .order("start_time", { ascending: false });

      if (shiftError) throw shiftError;

      // Add shift opened notifications
      if (recentShifts && recentShifts.length > 0) {
        recentShifts.forEach((shift) => {
          notifications.push({
            id: `shift-${shift.id}`,
            type: "shift_opened",
            title: "Shift Opened",
            message: `Shift opened by ${shift.profiles?.full_name || "Unknown"}`,
            read: false,
            created_at: shift.start_time,
          });
        });
      }

      // Sort by created_at descending
      notifications.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );

      const unreadCount = notifications.filter((n) => !n.read).length;

      set({ notifications, unreadCount, loading: false });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      set({ loading: false });
    }
  },

  // Mark notification as read
  markAsRead: (notificationId) => {
    const { notifications } = get();
    const updated = notifications.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n,
    );
    const unreadCount = updated.filter((n) => !n.read).length;
    set({ notifications: updated, unreadCount });
  },

  // Mark all as read
  markAllAsRead: () => {
    const { notifications } = get();
    const updated = notifications.map((n) => ({ ...n, read: true }));
    set({ notifications: updated, unreadCount: 0 });
  },

  // Toggle notification dropdown
  toggleDropdown: () => {
    set((state) => ({ isOpen: !state.isOpen }));
  },

  // Close dropdown
  closeDropdown: () => {
    set({ isOpen: false });
  },

  // Clear all notifications
  clearAll: () => {
    set({ notifications: [], unreadCount: 0 });
  },
}));

export default useNotificationStore;
