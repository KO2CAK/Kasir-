import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit,
  TrendingDown,
  Calendar,
  Filter,
  X,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/generateTransactionNumber";
import toast from "react-hot-toast";

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([
    { id: "supplies", name: "Supplies" },
    { id: "utilities", name: "Utilities" },
    { id: "rent", name: "Rent" },
    { id: "salaries", name: "Salaries" },
    { id: "maintenance", name: "Maintenance" },
    { id: "marketing", name: "Marketing" },
    { id: "other", name: "Other" },
  ]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [dateFilter, setDateFilter] = useState("all");

  // Form state
  const [formData, setFormData] = useState({
    description: "",
    category: "supplies",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchExpenses();
  }, [dateFilter]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      // Get current user for multi-tenant
      const { data: sessionData } = await supabase.auth.getUser();
      const userId = sessionData?.user?.id;

      let query = supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false });

      // Filter by user_id for multi-tenant
      if (userId) {
        query = query.eq("user_id", userId);
      }

      // Apply date filter
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateFilter === "today") {
        query = query.eq("date", today.toISOString().split("T")[0]);
      } else if (dateFilter === "week") {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte("date", weekAgo.toISOString().split("T")[0]);
      } else if (dateFilter === "month") {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte("date", monthAgo.toISOString().split("T")[0]);
      }

      const { data, error } = await query;

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      toast.error("Failed to fetch expenses");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Get current user for multi-tenant
      const { data: sessionData } = await supabase.auth.getUser();
      const userId = sessionData?.user?.id;

      if (!userId) {
        toast.error("You must be logged in to add expenses");
        return;
      }

      if (editingExpense) {
        // Update expense
        const { error } = await supabase
          .from("expenses")
          .update({
            description: formData.description,
            category: formData.category,
            amount: parseFloat(formData.amount),
            date: formData.date,
          })
          .eq("id", editingExpense.id);

        if (error) throw error;
        toast.success("Expense updated successfully");
      } else {
        // Create expense with user_id for multi-tenant
        const { error } = await supabase.from("expenses").insert([
          {
            description: formData.description,
            category: formData.category,
            amount: parseFloat(formData.amount),
            date: formData.date,
            user_id: userId, // Link to user for multi-tenant
          },
        ]);

        if (error) throw error;
        toast.success("Expense added successfully");
      }

      setModalOpen(false);
      resetForm();
      fetchExpenses();
    } catch (error) {
      toast.error(error.message || "Failed to save expense");
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      category: expense.category,
      amount: expense.amount.toString(),
      date: expense.date,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);

      if (error) throw error;
      toast.success("Expense deleted successfully");
      fetchExpenses();
    } catch (error) {
      toast.error("Failed to delete expense");
    }
  };

  const resetForm = () => {
    setFormData({
      description: "",
      category: "supplies",
      amount: "",
      date: new Date().toISOString().split("T")[0],
    });
    setEditingExpense(null);
  };

  const totalExpenses = expenses.reduce(
    (sum, exp) => sum + Number(exp.amount),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Expenses</h1>
          <p className="text-sm text-dark-500 mt-1">
            Track and manage your business expenses
          </p>
        </div>
        <Button icon={Plus} onClick={() => setModalOpen(true)}>
          Add Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-600/20 to-red-800/20 border-red-600/30">
          <Card.Content className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-dark-400">Total Expenses</p>
                <p className="text-2xl font-bold text-red-400">
                  {formatCurrency(totalExpenses)}
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-dark-700 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-dark-400" />
              </div>
              <div>
                <p className="text-sm text-dark-400">This Period</p>
                <p className="text-2xl font-bold text-dark-100">
                  {expenses.length} transactions
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-dark-700 flex items-center justify-center">
                <Filter className="h-6 w-6 text-dark-400" />
              </div>
              <div>
                <p className="text-sm text-dark-400">Filter</p>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="mt-1 px-3 py-1.5 bg-dark-800 border border-dark-600 rounded-lg text-sm text-dark-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <Card.Header>
          <h3 className="font-semibold text-dark-100">Expense History</h3>
        </Card.Header>
        <Card.Content>
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <TrendingDown className="h-12 w-12 text-dark-700 mb-3" />
              <p className="text-dark-500">No expenses found</p>
              <p className="text-dark-600 text-sm mt-1">
                Click "Add Expense" to record your first expense
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-dark-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-dark-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="border-b border-dark-800 hover:bg-dark-800/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-dark-300">
                        {formatDate(expense.date)}
                      </td>
                      <td className="py-3 px-4 text-sm text-dark-200">
                        {expense.description}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-dark-700 text-dark-300 capitalize">
                          {expense.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-red-400 text-right">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="p-1.5 text-dark-500 hover:text-primary-400 hover:bg-dark-700 rounded-lg transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-1.5 text-dark-500 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Add/Edit Expense Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={editingExpense ? "Edit Expense" : "Add Expense"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Description"
            placeholder="Enter expense description..."
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            required
          />

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-sm text-dark-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Amount"
            type="number"
            placeholder="Enter amount..."
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
            icon={TrendingDown}
            required
            min="0"
            step="0.01"
          />

          <Input
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" icon={Plus}>
              {editingExpense ? "Update" : "Add"} Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Expenses;
