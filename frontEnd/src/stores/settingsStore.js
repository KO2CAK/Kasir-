import { create } from "zustand";
import { supabase } from "@/lib/supabase";

const useSettingsStore = create((set, get) => ({
  settings: null,
  loading: true,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      set({ settings: data, loading: false });
      return data;
    } catch (error) {
      console.error("Failed to fetch store settings:", error);
      // Return defaults if table doesn't exist or no data
      const defaults = {
        store_name: "KasirPOS Store",
        address: "",
        phone: "",
        footer_message: "Thank you for your purchase!",
        logo_url: null,
        currency: "IDR",
        tax_rate: 0,
      };
      set({ settings: defaults, loading: false, error: error.message });
      return defaults;
    }
  },

  updateSettings: async (updates) => {
    try {
      const current = get().settings;
      if (!current?.id) {
        // Insert new row if no settings exist
        const { data, error } = await supabase
          .from("store_settings")
          .insert([updates])
          .select()
          .single();
        if (error) throw error;
        set({ settings: data });
        return { data, error: null };
      }

      // Update existing row
      const { data, error } = await supabase
        .from("store_settings")
        .update(updates)
        .eq("id", current.id)
        .select()
        .single();

      if (error) throw error;
      set({ settings: data });
      return { data, error: null };
    } catch (error) {
      console.error("Failed to update store settings:", error);
      return { data: null, error };
    }
  },
}));

export default useSettingsStore;
