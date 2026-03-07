import { create } from "zustand";
import { supabase } from "@/lib/supabase";

const useShiftStore = create((set, get) => ({
  currentShift: null,
  shifts: [],
  loading: false,
  error: null,

  // Fetch current open shift for user
  fetchCurrentShift: async (userId) => {
    if (!userId) return;
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("cashier_id", userId)
        .eq("status", "open")
        .order("start_time", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      set({ currentShift: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Fetch shift history
  fetchShifts: async (userId) => {
    if (!userId) return;
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("cashier_id", userId)
        .order("start_time", { ascending: false })
        .limit(20);

      if (error) throw error;
      set({ shifts: data || [], loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Open a new shift
  openShift: async (userId, startingCash) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from("shifts")
        .insert([
          {
            cashier_id: userId,
            starting_cash: startingCash,
            status: "open",
          },
        ])
        .select()
        .single();

      if (error) throw error;
      set({ currentShift: data, loading: false });
      return { success: true, shift: data };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // Close current shift
  closeShift: async (shiftId, actualCash, notes) => {
    set({ loading: true });
    try {
      // Get shift with sales data
      const { data: shift } = await supabase
        .from("shifts")
        .select("*")
        .eq("id", shiftId)
        .single();

      if (!shift) throw new Error("Shift not found");

      // Calculate totals from transactions
      const { data: txData } = await supabase
        .from("transactions")
        .select("total, payment_method")
        .eq("shift_id", shiftId);

      const totalSales = (txData || []).reduce(
        (sum, tx) => sum + Number(tx.total),
        0,
      );
      const totalTransactions = (txData || []).length;
      const totalCash = (txData || [])
        .filter((tx) => tx.payment_method === "cash")
        .reduce((sum, tx) => sum + Number(tx.total), 0);

      const expectedCash = shift.starting_cash + totalCash;
      const cashDifference = actualCash - expectedCash;

      const { data, error } = await supabase
        .from("shifts")
        .update({
          end_time: new Date().toISOString(),
          total_actual_cash: actualCash,
          total_expected_cash: expectedCash,
          total_sales: totalSales,
          total_transactions: totalTransactions,
          cash_difference: cashDifference,
          status: "closed",
          notes: notes,
        })
        .eq("id", shiftId)
        .select()
        .single();

      if (error) throw error;
      set({ currentShift: null, loading: false });
      return { success: true, shift: data };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  // Get shift summary
  getShiftSummary: async (shiftId) => {
    try {
      // Get shift data
      const { data: shift } = await supabase
        .from("shifts")
        .select("*")
        .eq("id", shiftId)
        .single();

      if (!shift) return null;

      // Get transactions for this shift
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*, profiles(full_name)")
        .eq("shift_id", shiftId)
        .order("created_at", { ascending: false });

      // Calculate payment breakdown
      const paymentBreakdown = {};
      (transactions || []).forEach((tx) => {
        const method = tx.payment_method;
        paymentBreakdown[method] =
          (paymentBreakdown[method] || 0) + Number(tx.total);
      });

      return {
        shift,
        transactions: transactions || [],
        paymentBreakdown,
        expectedCash: shift.starting_cash + (paymentBreakdown.cash || 0),
      };
    } catch (error) {
      console.error("Error getting shift summary:", error);
      return null;
    }
  },
}));

export default useShiftStore;
