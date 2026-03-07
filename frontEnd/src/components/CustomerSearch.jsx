import React, { useState, useEffect, useRef } from "react";
import { Search, User, Phone, X, Plus, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/utils/formatCurrency";

const CustomerSearch = ({ onSelect, onClose, selectedCustomer }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length >= 2) {
      debounceRef.current = setTimeout(searchCustomers, 300);
    } else {
      setResults([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const searchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, points, total_spent, visits")
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
        .eq("is_active", true)
        .limit(10);

      if (error) throw error;
      setResults(data || []);
      setShowResults(true);
    } catch (error) {
      console.error("Error searching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (customer) => {
    onSelect?.(customer);
    setShowResults(false);
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert([newCustomer])
        .select()
        .single();

      if (error) throw error;
      onSelect?.(data);
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding customer:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose?.();
    }
  };

  if (selectedCustomer) {
    return (
      <div className="flex items-center gap-3 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-dark-200 truncate">
            {selectedCustomer.name}
          </p>
          <p className="text-xs text-dark-500">
            {selectedCustomer.phone} • {selectedCustomer.points} points
          </p>
        </div>
        <button
          onClick={() => onSelect?.(null)}
          className="p-1 text-dark-400 hover:text-red-400 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      {!showAddForm ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search customer by name or phone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-dark-400 hover:text-dark-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {loading && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-600 rounded-lg p-3 text-center">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}

          {showResults && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-600 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
              {results.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelect(customer)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-primary-600/10 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-200 truncate">
                      {customer.name}
                    </p>
                    <p className="text-xs text-dark-500 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-dark-400">
                      {customer.points} pts
                    </p>
                    <p className="text-xs text-dark-500">
                      {customer.visits} visits
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {query.length >= 2 && !loading && results.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-600 rounded-lg p-4 text-center">
              <p className="text-sm text-dark-400 mb-3">No customers found</p>
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setNewCustomer({ name: "", phone: query });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add New Customer
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium text-dark-200">
            Add New Customer
          </h4>
          <input
            type="text"
            placeholder="Customer Name"
            value={newCustomer.name}
            onChange={(e) =>
              setNewCustomer({ ...newCustomer, name: e.target.value })
            }
            className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
          <input
            type="tel"
            placeholder="Phone Number"
            value={newCustomer.phone}
            onChange={(e) =>
              setNewCustomer({ ...newCustomer, phone: e.target.value })
            }
            className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddCustomer}
              disabled={saving || !newCustomer.name || !newCustomer.phone}
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-dark-600 disabled:text-dark-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSearch;
