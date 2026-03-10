import React, { useEffect, useState } from "react";
import {
  Users as UsersIcon,
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  ShieldOff,
  Mail,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import useAuthStore from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

const Users = () => {
  const { profile: currentProfile } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    password: "",
    role: "cashier",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("account_id", currentProfile?.account_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        const { error } = await supabase
          .from("profiles")
          .update({ full_name: formData.full_name, role: formData.role })
          .eq("id", editingUser.id);
        if (error) throw error;
        toast.success("User updated successfully");
      } else {
        const { error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.full_name,
              role: formData.role,
              account_id: currentProfile.account_id,
            },
          },
        });
        if (authError) throw authError;
        toast.success("User created. Check email to verify.");
      }
      setShowModal(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error(error.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email || "",
      full_name: user.full_name || "",
      password: "",
      role: user.role || "cashier",
    });
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .single();
      if (userError) throw userError;
      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        userData.email,
      );
      if (deleteError) throw deleteError;
      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Failed to delete user");
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({ email: "", full_name: "", password: "", role: "cashier" });
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-dark-700 rounded" />
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-dark-800 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-dark-100">User Management</h2>
          <p className="text-sm text-dark-500 mt-0.5">
            Manage your team members and their roles
          </p>
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>
          Add User
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-sm text-dark-200"
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-dark-500 uppercase">
                  User
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-dark-500 uppercase">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-dark-500 uppercase">
                  Joined
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-dark-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-dark-700/50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-600/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary-400">
                          {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-dark-200">
                          {user.full_name || "No name"}
                        </p>
                        <p className="text-xs text-dark-500">
                          {user.email || "No email"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${user.role === "admin" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}`}
                    >
                      {user.role === "admin" ? (
                        <Shield className="w-3 h-3" />
                      ) : (
                        <ShieldOff className="w-3 h-3" />
                      )}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-dark-400">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "-"}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-dark-400 hover:text-dark-200 hover:bg-dark-700 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {user.id !== currentProfile?.id && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingUser ? "Edit User" : "Add New User"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingUser && (
            <Input
              label="Email"
              type="email"
              placeholder="user@example.com"
              icon={Mail}
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          )}
          <Input
            label="Full Name"
            type="text"
            placeholder="John Doe"
            icon={UsersIcon}
            value={formData.full_name}
            onChange={(e) =>
              setFormData({ ...formData, full_name: e.target.value })
            }
            required
          />
          {!editingUser && (
            <Input
              label="Password"
              type="password"
              placeholder="Min 6 characters"
              icon={Shield}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          )}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              Role
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: "admin" })}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border ${formData.role === "admin" ? "bg-purple-600/20 border-purple-500 text-purple-400" : "bg-dark-800 border-dark-600 text-dark-400"}`}
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: "cashier" })}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border ${formData.role === "cashier" ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-dark-800 border-dark-600 text-dark-400"}`}
              >
                <ShieldOff className="w-4 h-4" />
                Cashier
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingUser ? "Update User" : "Create User"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
