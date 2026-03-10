import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  AlertTriangle,
  Tag,
  X,
  PackagePlus,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/utils/formatCurrency";
import { useVisibilityHandler } from "@/hooks/useVisibilityHandler";
import useAuthStore from "@/stores/authStore";
import toast from "react-hot-toast";

const Inventory = () => {
  const { user } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category_id: "",
    price: "",
    stock: "",
    image_url: "",
    is_active: true,
  });

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
  });

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [savingStock, setSavingStock] = useState(false);
  const [stockForm, setStockForm] = useState({
    adjustment: "",
    type: "restock",
    notes: "",
  });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const isMounted = useRef(true);

  // Handle visibility change - refresh data when tab becomes visible
  useVisibilityHandler(() => {
    if (!loading && isMounted.current) {
      fetchProducts();
      fetchCategories();
    }
  });

  const fetchProducts = useCallback(async () => {
    // Prevent fetch if component is unmounted
    if (!isMounted.current) return;

    try {
      const { data: sessionData } = await supabase.auth.getUser();
      const userId = sessionData?.user?.id;

      let query = supabase
        .from("products")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });

      // Filter by user_id for multi-tenant isolation
      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Only update state if component is still mounted
      if (isMounted.current) {
        setProducts(data || []);
      }
    } catch (error) {
      toast.error("Failed to fetch products");
    } finally {
      // Only update loading state if component is still mounted
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    // Prevent fetch if component is unmounted
    if (!isMounted.current) return;

    try {
      const { data: sessionData } = await supabase.auth.getUser();
      const userId = sessionData?.user?.id;

      let query = supabase.from("categories").select("*").order("name");

      // Filter by user_id for multi-tenant isolation
      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Only update state if component is still mounted
      if (isMounted.current) {
        setCategories(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }, []);

  useEffect(() => {
    // Set mounted to true on mount
    isMounted.current = true;

    fetchProducts();
    fetchCategories();

    // Cleanup: set mounted to false on unmount to prevent state updates
    return () => {
      isMounted.current = false;
    };
  }, [fetchProducts, fetchCategories]);

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setSavingProduct(true);

    // Safety timeout — force stop loading after 10 seconds
    const timeoutId = setTimeout(() => {
      setSavingProduct(false);
      toast.error(
        "Request timed out. Please check your connection and try again.",
      );
      console.error("Product save timed out after 10 seconds");
    }, 10000);

    try {
      // 1. Verify user session
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getUser();
      if (sessionError || !sessionData?.user) {
        console.error("Session check failed:", sessionError);
        toast.error("Your session has expired. Please log in again.");
        clearTimeout(timeoutId);
        setSavingProduct(false);
        return;
      }
      console.log("Session valid. User ID:", sessionData.user.id);

      // 2. Validate and cast category_id
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const categoryId =
        formData.category_id && uuidRegex.test(formData.category_id)
          ? formData.category_id
          : null;

      const userId = sessionData.user.id;

      // 3. Build product data with user_id for multi-tenant
      const productData = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        category_id: categoryId,
        price: Number(parseFloat(formData.price).toFixed(2)),
        stock: Math.floor(Number(formData.stock)),
        image_url: formData.image_url.trim() || null,
        is_active: Boolean(formData.is_active),
        user_id: userId, // Link to user for multi-tenant
      };

      console.log(
        "Sending product data:",
        JSON.stringify(productData, null, 2),
      );

      if (editingProduct) {
        // ── UPDATE PRODUCT ──
        console.log("Updating product ID:", editingProduct.id);
        const { data: updatedData, error: updateError } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id)
          .select();

        if (updateError) {
          console.error("Supabase Update Error:", updateError);
          throw updateError;
        }
        console.log("Product updated:", updatedData);

        // Log stock change if stock was modified (non-blocking)
        if (productData.stock !== editingProduct.stock) {
          const stockDiff = productData.stock - editingProduct.stock;
          console.log("Stock changed by:", stockDiff);
          supabase
            .from("stock_history")
            .insert([
              {
                product_id: editingProduct.id,
                change_type: "adjustment",
                quantity_change: stockDiff,
                stock_before: editingProduct.stock,
                stock_after: productData.stock,
                notes: "Stock adjusted via product edit",
                created_by: sessionData.user.id,
              },
            ])
            .then(({ error: histErr }) => {
              if (histErr)
                console.error(
                  "Stock history insert error (non-blocking):",
                  histErr,
                );
              else console.log("Stock history logged for edit");
            });
        }

        toast.success("Product updated successfully");
      } else {
        // ── CREATE PRODUCT ──
        console.log("Creating new product...");
        const { data: newProduct, error: insertError } = await supabase
          .from("products")
          .insert([productData])
          .select()
          .single();

        if (insertError) {
          console.error("Supabase Insert Error:", insertError);
          throw insertError;
        }
        console.log("Product created:", newProduct);

        // Log initial stock (non-blocking — don't let this block the UI)
        if (newProduct && productData.stock > 0) {
          supabase
            .from("stock_history")
            .insert([
              {
                product_id: newProduct.id,
                change_type: "initial",
                quantity_change: productData.stock,
                stock_before: 0,
                stock_after: productData.stock,
                notes: "Initial stock on product creation",
                created_by: sessionData.user.id,
              },
            ])
            .then(({ error: histErr }) => {
              if (histErr)
                console.error(
                  "Stock history insert error (non-blocking):",
                  histErr,
                );
              else console.log("Stock history logged for new product");
            });
        }

        toast.success("Product created successfully");
      }

      clearTimeout(timeoutId);
      setIsProductModalOpen(false);
      resetProductForm();
      fetchProducts();
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Product save failed:", error);
      const message =
        error?.message || error?.details || "Failed to save product";
      toast.error(message);
    } finally {
      clearTimeout(timeoutId);
      setSavingProduct(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category_id: product.category_id || "",
      price: product.price.toString(),
      stock: product.stock.toString(),
      image_url: product.image_url || "",
      is_active: product.is_active,
    });
    setIsProductModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeletingProduct(true);
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Product deleted successfully");
      setDeleteTarget(null);
      fetchProducts();
    } catch (error) {
      toast.error(error.message || "Failed to delete product");
    } finally {
      setDeletingProduct(false);
    }
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      sku: "",
      category_id: "",
      price: "",
      stock: "",
      image_url: "",
      is_active: true,
    });
  };

  const openCreateModal = () => {
    resetProductForm();
    setIsProductModalOpen(true);
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setSavingCategory(true);
    try {
      // Get current user
      const { data: sessionData } = await supabase.auth.getUser();
      const userId = sessionData?.user?.id;

      if (!userId) {
        toast.error("You must be logged in to create a category");
        setSavingCategory(false);
        return;
      }

      const { error } = await supabase.from("categories").insert([
        {
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || null,
          user_id: userId, // Link to user for multi-tenant
        },
      ]);
      if (error) throw error;
      toast.success("Category created successfully");
      setCategoryForm({ name: "", description: "" });
      setIsCategoryModalOpen(false);
      fetchCategories();
    } catch (error) {
      if (error.message?.includes("duplicate")) {
        toast.error("A category with this name already exists");
      } else {
        toast.error(error.message || "Failed to create category");
      }
    } finally {
      setSavingCategory(false);
    }
  };

  const openStockModal = (product) => {
    setStockProduct(product);
    setStockForm({ adjustment: "", type: "restock", notes: "" });
    setIsStockModalOpen(true);
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    if (!stockProduct) return;
    setSavingStock(true);
    try {
      const qty = parseInt(stockForm.adjustment);
      if (isNaN(qty) || qty <= 0) {
        toast.error("Please enter a valid positive number");
        setSavingStock(false);
        return;
      }
      const quantityChange = stockForm.type === "restock" ? qty : -qty;
      const newStock = stockProduct.stock + quantityChange;
      if (newStock < 0) {
        toast.error("Stock cannot go below 0");
        setSavingStock(false);
        return;
      }
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", stockProduct.id);
      if (updateError) throw updateError;
      await supabase.from("stock_history").insert([
        {
          product_id: stockProduct.id,
          change_type: stockForm.type,
          quantity_change: quantityChange,
          stock_before: stockProduct.stock,
          stock_after: newStock,
          notes: stockForm.notes.trim() || "Manual " + stockForm.type,
          created_by: user?.id || null,
        },
      ]);
      toast.success(
        "Stock " +
          (stockForm.type === "restock" ? "increased" : "decreased") +
          " by " +
          qty,
      );
      setIsStockModalOpen(false);
      fetchProducts();
    } catch (error) {
      toast.error(error.message || "Failed to adjust stock");
    } finally {
      setSavingStock(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || product.category_id === selectedCategory;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && product.is_active) ||
      (statusFilter === "inactive" && !product.is_active) ||
      (statusFilter === "low" && product.stock < 10 && product.is_active);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.is_active).length;
  const lowStockProducts = products.filter(
    (p) => p.stock < 10 && p.is_active,
  ).length;
  const outOfStockProducts = products.filter(
    (p) => p.stock === 0 && p.is_active,
  ).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-dark-800 border border-dark-700 rounded-xl p-4 animate-pulse"
            >
              <div className="h-3 w-16 bg-dark-700 rounded mb-2" />
              <div className="h-6 w-12 bg-dark-700 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 animate-pulse">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-dark-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter("all")}
          className={
            "text-left p-4 rounded-xl border transition-all " +
            (statusFilter === "all"
              ? "bg-dark-800 border-primary-600/30"
              : "bg-dark-800/50 border-dark-700 hover:border-dark-600")
          }
        >
          <p className="text-xs text-dark-400 font-medium">Total Products</p>
          <p className="text-xl font-bold text-dark-100 mt-1">
            {totalProducts}
          </p>
        </button>
        <button
          onClick={() => setStatusFilter("active")}
          className={
            "text-left p-4 rounded-xl border transition-all " +
            (statusFilter === "active"
              ? "bg-dark-800 border-primary-600/30"
              : "bg-dark-800/50 border-dark-700 hover:border-dark-600")
          }
        >
          <p className="text-xs text-dark-400 font-medium">Active</p>
          <p className="text-xl font-bold text-primary-400 mt-1">
            {activeProducts}
          </p>
        </button>
        <button
          onClick={() => setStatusFilter("low")}
          className={
            "text-left p-4 rounded-xl border transition-all " +
            (statusFilter === "low"
              ? "bg-dark-800 border-amber-600/30"
              : "bg-dark-800/50 border-dark-700 hover:border-dark-600")
          }
        >
          <p className="text-xs text-dark-400 font-medium">Low Stock</p>
          <p className="text-xl font-bold text-amber-400 mt-1">
            {lowStockProducts}
          </p>
        </button>
        <div className="text-left p-4 rounded-xl border bg-dark-800/50 border-dark-700">
          <p className="text-xs text-dark-400 font-medium">Out of Stock</p>
          <p className="text-xl font-bold text-red-400 mt-1">
            {outOfStockProducts}
          </p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:max-w-xs">
            <Input
              placeholder="Search products..."
              icon={Search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-sm text-dark-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            icon={Tag}
            onClick={() => setIsCategoryModalOpen(true)}
          >
            Add Category
          </Button>
          <Button icon={Plus} onClick={openCreateModal}>
            Add Product
          </Button>
        </div>
      </div>

      {/* Active filter chips */}
      {(statusFilter !== "all" ||
        searchQuery ||
        selectedCategory !== "all") && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-dark-500">Filters:</span>
          {statusFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-600/10 text-primary-400">
              {statusFilter === "active"
                ? "Active"
                : statusFilter === "inactive"
                  ? "Inactive"
                  : "Low Stock"}
              <button
                onClick={() => setStatusFilter("all")}
                className="hover:text-primary-300"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedCategory !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-600/10 text-blue-400">
              {categories.find((c) => c.id === selectedCategory)?.name}
              <button
                onClick={() => setSelectedCategory("all")}
                className="hover:text-blue-300"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-600/10 text-violet-400">
              "{searchQuery}"
              <button
                onClick={() => setSearchQuery("")}
                className="hover:text-violet-300"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            onClick={() => {
              setStatusFilter("all");
              setSelectedCategory("all");
              setSearchQuery("");
            }}
            className="text-xs text-dark-500 hover:text-dark-300 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Products Table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  Product
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  SKU
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="text-right py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  Price
                </th>
                <th className="text-right py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  Stock
                </th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center">
                    <Package className="h-12 w-12 text-dark-700 mx-auto mb-3" />
                    <p className="text-dark-400 text-sm font-medium">
                      {searchQuery ||
                      selectedCategory !== "all" ||
                      statusFilter !== "all"
                        ? "No products match your filters"
                        : "No products yet"}
                    </p>
                    <p className="text-dark-600 text-xs mt-1">
                      {searchQuery ||
                      selectedCategory !== "all" ||
                      statusFilter !== "all"
                        ? "Try adjusting your search or filters"
                        : 'Click "Add Product" to get started'}
                    </p>
                    {!searchQuery &&
                      selectedCategory === "all" &&
                      statusFilter === "all" && (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Plus}
                          className="mt-4"
                          onClick={openCreateModal}
                        >
                          Add Your First Product
                        </Button>
                      )}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-dark-800/50 transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-dark-700 rounded-lg flex items-center justify-center flex-shrink-0">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-dark-500" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-dark-200">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-mono text-dark-400">
                        {product.sku}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-dark-700 text-dark-300">
                        {product.categories?.name || "Uncategorized"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm font-semibold text-dark-200">
                        {formatCurrency(product.price)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {product.stock === 0 && (
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                        )}
                        {product.stock > 0 && product.stock < 10 && (
                          <AlertTriangle className="h-4 w-4 text-amber-400" />
                        )}
                        <span
                          className={
                            "text-sm font-semibold " +
                            (product.stock === 0
                              ? "text-red-400"
                              : product.stock < 10
                                ? "text-amber-400"
                                : "text-dark-200")
                          }
                        >
                          {product.stock}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " +
                          (product.is_active
                            ? "bg-primary-600/10 text-primary-400"
                            : "bg-red-600/10 text-red-400")
                        }
                      >
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openStockModal(product)}
                          className="p-2 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-400/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Adjust Stock"
                        >
                          <PackagePlus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 rounded-lg text-dark-400 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(product)}
                          className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredProducts.length > 0 && (
          <div className="px-6 py-3 border-t border-dark-700">
            <p className="text-xs text-dark-500">
              Showing {filteredProducts.length} of {totalProducts} products
            </p>
          </div>
        )}
      </Card>

      {/* Create/Edit Product Modal */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? "Edit Product" : "Add New Product"}
        size="lg"
      >
        <form onSubmit={handleProductSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Product Name"
              placeholder="Enter product name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
            <Input
              label="SKU"
              placeholder="e.g., PRD-001"
              value={formData.sku}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  sku: e.target.value.toUpperCase(),
                }))
              }
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">
                Category
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category_id: e.target.value,
                    }))
                  }
                  className="flex-1 px-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-sm text-dark-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="px-3 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-dark-400 hover:text-primary-400 hover:border-primary-500/40 transition-colors"
                  title="Add new category"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <Input
              label="Image URL"
              placeholder="https://..."
              value={formData.image_url}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, image_url: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Price (IDR)"
              type="number"
              placeholder="0"
              min="0"
              step="100"
              value={formData.price}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, price: e.target.value }))
              }
              required
            />
            <Input
              label="Stock"
              type="number"
              placeholder="0"
              min="0"
              value={formData.stock}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, stock: e.target.value }))
              }
              required
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  is_active: e.target.checked,
                }))
              }
              className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-600 focus:ring-primary-500/40"
            />
            <label htmlFor="is_active" className="text-sm text-dark-300">
              Product is active and available for sale
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button
              variant="secondary"
              onClick={() => setIsProductModalOpen(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit" loading={savingProduct}>
              {editingProduct ? "Update Product" : "Create Product"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Add New Category"
        size="sm"
      >
        <form onSubmit={handleCategorySubmit} className="space-y-4">
          <Input
            label="Category Name"
            placeholder="e.g., Beverages"
            value={categoryForm.name}
            onChange={(e) =>
              setCategoryForm((prev) => ({ ...prev, name: e.target.value }))
            }
            required
          />
          <Input
            label="Description (optional)"
            placeholder="Brief description..."
            value={categoryForm.description}
            onChange={(e) =>
              setCategoryForm((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
            <Button
              variant="secondary"
              onClick={() => setIsCategoryModalOpen(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit" loading={savingCategory}>
              Create Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title="Adjust Stock"
        size="sm"
      >
        {stockProduct && (
          <form onSubmit={handleStockSubmit} className="space-y-4">
            <div className="bg-dark-700/50 rounded-lg p-4">
              <p className="text-sm font-medium text-dark-200">
                {stockProduct.name}
              </p>
              <p className="text-xs text-dark-400 mt-1">
                SKU: {stockProduct.sku}
              </p>
              <p className="text-lg font-bold text-dark-100 mt-2">
                Current Stock:{" "}
                <span
                  className={
                    stockProduct.stock < 10
                      ? "text-amber-400"
                      : "text-primary-400"
                  }
                >
                  {stockProduct.stock}
                </span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">
                Adjustment Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setStockForm((prev) => ({ ...prev, type: "restock" }))
                  }
                  className={
                    "flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all " +
                    (stockForm.type === "restock"
                      ? "bg-primary-600/10 border-primary-500 text-primary-400"
                      : "bg-dark-800 border-dark-600 text-dark-400 hover:border-dark-500")
                  }
                >
                  Restock (+)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setStockForm((prev) => ({ ...prev, type: "adjustment" }))
                  }
                  className={
                    "flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all " +
                    (stockForm.type === "adjustment"
                      ? "bg-red-600/10 border-red-500 text-red-400"
                      : "bg-dark-800 border-dark-600 text-dark-400 hover:border-dark-500")
                  }
                >
                  Reduce (-)
                </button>
              </div>
            </div>

            <Input
              label="Quantity"
              type="number"
              placeholder="Enter quantity"
              min="1"
              value={stockForm.adjustment}
              onChange={(e) =>
                setStockForm((prev) => ({
                  ...prev,
                  adjustment: e.target.value,
                }))
              }
              required
            />

            <Input
              label="Notes (optional)"
              placeholder="Reason for adjustment..."
              value={stockForm.notes}
              onChange={(e) =>
                setStockForm((prev) => ({ ...prev, notes: e.target.value }))
              }
            />

            {stockForm.adjustment && parseInt(stockForm.adjustment) > 0 && (
              <div className="bg-dark-700/50 rounded-lg p-3 text-sm">
                <span className="text-dark-400">New stock will be: </span>
                <span className="font-bold text-dark-100">
                  {stockProduct.stock +
                    (stockForm.type === "restock"
                      ? parseInt(stockForm.adjustment)
                      : -parseInt(stockForm.adjustment))}
                </span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
              <Button
                variant="secondary"
                onClick={() => setIsStockModalOpen(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button type="submit" loading={savingStock}>
                Apply Adjustment
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative max-w-sm w-full mx-4 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl p-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-600/10 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-dark-100 mb-2">
                Delete Product
              </h3>
              <p className="text-sm text-dark-400 mb-6">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-dark-200">
                  "{deleteTarget.name}"
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setDeleteTarget(null)}
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={handleDeleteConfirm}
                  loading={deletingProduct}
                  type="button"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
