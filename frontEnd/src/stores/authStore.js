import { create } from "zustand";
import { supabase } from "@/lib/supabase";

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,

  // Initialize auth state
  initialize: async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        set({
          user: session.user,
          session,
          profile,
          loading: false,
        });
      } else {
        set({ user: null, session: null, profile: null, loading: false });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          set({ user: session.user, session, profile });
        } else if (event === "SIGNED_OUT") {
          set({ user: null, session: null, profile: null });
        }
      });
    } catch (error) {
      console.error("Auth initialization error:", error);
      set({ loading: false });
    }
  },

  // Sign in with email and password
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  // Sign up with email and password
  signUp: async (email, password, fullName, role = "cashier") => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (error) throw error;
    return data;
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null, session: null, profile: null });
  },

  // Check if user is admin
  isAdmin: () => {
    const { profile } = get();
    return profile?.role === "admin";
  },
}));

export default useAuthStore;
