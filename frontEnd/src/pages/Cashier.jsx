import React, { useEffect, useState, useRef } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Wallet,
  Banknote,
  X,
  CheckCircle,
  Package,
  QrCode,
  Printer,
  Clock,
  Briefcase,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import ReceiptPreview from "@/components/ReceiptPreview";
import { supabase } from "@/lib/supabase";

import { formatCurrency } from "@/utils/formatCurrency";
import { generateTransactionNumber } from "@/utils/generateTransactionNumber";
import { useVisibilityHandler } from "@/hooks/useVisibilityHandler";
import useCartStore from "@/stores/cartStore";
import useAuthStore from "@/stores/authStore";
import useShiftStore from "@/stores/shiftStore";
import useSettingsStore from "@/stores/settingsStore";
import toast from "react-hot-toast";

const Cashier = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [processing, setProcessing] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [lastTransactionItems, setLastTransactionItems] = useState([]);
  const [qrisModal, setQrisModal] = useState(false);
  const [qrisCountdown, setQrisCountdown] = useState(0);
  const receiptRef = useRef(null);
  const isMounted = useRef(true);

  const { user, profile } = useAuthStore();
  const { settings, fetchSettings } = useSettingsStore();
  const { currentShift, fetchCurrentShift } = useShiftStore();

  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    discount,
    setDiscount,
    getSubtotal,
    getDiscountAmount,
    getTaxAmount,
    getTotal,
    clearCart,
    getItemCount,
  } = useCartStore();

  // Handle visibility change - refresh data when tab becomes visible
  useVisibilityHandler(() => {
    if (!loading && isMounted.current) {
      fetchProducts();
      fetchCategories();
    }
  });

  useEffect(() => {
    // Set mounted to true on mount
    isMounted.current = true;

    fetchProducts();
    fetchCategories();
    if (!settings) fetchSettings();

    // Cleanup: set mounted to false on unmount to prevent state updates
    return () => {
      isMounted.current = false;
    };
  }, []);

  // QRIS countdown timer
  useEffect(() => {
    let timer;
    if (qrisModal && qrisCountdown > 0) {
      timer = setInterval(() => {
        setQrisCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [qrisModal, qrisCountdown]);

  const fetchProducts = async () => {
    // Prevent fetch if component is unmounted
    if (!isMounted.current) return;

    try {
      const { data: sessionData } = await supabase.auth.getUser();
      const userId = sessionData?.user?.id;

      let query = supabase
        .from("products")
        .select("*, categories(name)")
        .eq("is_active", true)
        .gt("stock", 0)
        .order("name");

      // Filter by user_id if logged in (for multi-tenant)
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
  };

  const fetchCategories = async () => {
    // Prevent fetch if component is unmounted
    if (!isMounted.current) return;

    try {
      const { data: sessionData } = await supabase.auth.getUser();
      const userId = sessionData?.user?.id;

      let query = supabase.from("categories").select("*").order("name");

      // Filter by user_id if logged in (for multi-tenant)
      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data } = await query;

      // Only update state if component is still mounted
      if (isMounted.current) {
        setCategories(data || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddToCart = (product) => {
    try {
      addItem(product);
      toast.success(`${product.name} added to cart`, {
        duration: 1500,
        icon: "🛒",
      });
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    const total = getTotal();
    const paid = parseFloat(amountPaid);

    if (paymentMethod === "cash" && paid < total) {
      toast.error("Insufficient payment amount");
      return;
    }

    setProcessing(true);

    try {
      const { data: sessionData } = await supabase.auth.getUser();
      const userId = sessionData?.user?.id;

      const transactionNumber = generateTransactionNumber();
      const subtotal = getSubtotal();
      const discountAmount = getDiscountAmount();
      const taxAmount = getTaxAmount();
      const changeAmount = paymentMethod === "cash" ? paid - total : 0;

      // Create transaction
      const { data: transaction, error: txError } = await supabase
        .from("transactions")
        .insert([
          {
            transaction_number: transactionNumber,
            cashier_id: user.id,
            user_id: userId,
            subtotal: subtotal,
            discount: discountAmount,
            tax: taxAmount,
            total: total,
            payment_method: paymentMethod,
            amount_paid: paymentMethod === "cash" ? paid : total,
            change_amount: changeAmount,
          },
        ])
        .select()
        .single();

      if (txError) throw txError;

      // Create transaction items
      const transactionItems = items.map((item) => ({
        transaction_id: transaction.id,
        product_id: item.id,
        product_name: item.name,
        product_price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase
        .from("transaction_items")
        .insert(transactionItems);

      if (itemsError) throw itemsError;

      // Build items with snapshot data for receipt
      const receiptItems = items.map((item) => ({
        product_name: item.name,
        product_price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
      }));

      // Success
      setLastTransaction({
        ...transaction,
        cashier_name: profile?.full_name || "Cashier",
        change_amount: changeAmount,
      });
      setLastTransactionItems(receiptItems);

      clearCart();
      setCheckoutModal(false);
      setQrisModal(false);
      setSuccessModal(true);
      setAmountPaid("");
      setPaymentMethod("cash");
      fetchProducts(); // Refresh stock

      toast.success("Transaction completed!");
    } catch (error) {
      toast.error(error.message || "Transaction failed");
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleQrisPayment = () => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setPaymentMethod("qris");
    setQrisCountdown(300); // 5 minutes
    setQrisModal(true);
  };

  const confirmQrisPayment = () => {
    setQrisModal(false);
    setCheckoutModal(false);
    handleCheckout();
  };

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const generateQrisValue = () => {
    const total = getTotal();
    const storeName = settings?.store_name || "KasirPOS";
    // Simulated QRIS payload — in production, integrate with payment gateway
    return `00020101021126570016COM.KASIRPOS.WWW0118${storeName}0215${generateTransactionNumber()}5204541153033605802ID5913${storeName}6007JAKARTA61051234062070703***6304`;
  };

  const paymentMethods = [
    { id: "cash", label: "Cash", icon: Banknote },
    { id: "card", label: "Card", icon: CreditCard },
    { id: "e-wallet", label: "E-Wallet", icon: Wallet },
    { id: "qris", label: "QRIS", icon: QrCode },
  ];

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Left: Product Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search & Filter */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search products by name or SKU..."
              icon={Search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-sm text-dark-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          >
            <option value="all">All</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pr-2">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Package className="h-16 w-16 text-dark-700 mb-3" />
              <p className="text-dark-500">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleAddToCart(product)}
                  className="bg-dark-800 border border-dark-700 rounded-xl p-4 text-left hover:border-primary-600/50 hover:bg-dark-800/80 transition-all duration-200 group"
                >
                  <div className="w-full h-20 bg-dark-700 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Package className="h-8 w-8 text-dark-500 group-hover:text-primary-500 transition-colors" />
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-dark-200 truncate">
                    {product.name}
                  </h3>
                  <p className="text-xs text-dark-500 mt-0.5">
                    Stock: {product.stock}
                  </p>
                  <p className="text-sm font-bold text-primary-400 mt-1">
                    {formatCurrency(product.price)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-96 flex flex-col bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
        {/* Cart Header */}
        <div className="px-5 py-4 border-b border-dark-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary-400" />
            <h3 className="font-semibold text-dark-100">Cart</h3>
            {getItemCount() > 0 && (
              <span className="bg-primary-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {getItemCount()}
              </span>
            )}
          </div>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-dark-500 hover:text-red-400 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart className="h-12 w-12 text-dark-700 mb-3" />
              <p className="text-dark-500 text-sm">Cart is empty</p>
              <p className="text-dark-600 text-xs mt-1">
                Click products to add them
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-dark-900 rounded-lg p-3 border border-dark-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-dark-200 truncate">
                      {item.name}
                    </h4>
                    <p className="text-xs text-dark-500">
                      {formatCurrency(item.price)} each
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-dark-500 hover:text-red-400 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-md bg-dark-700 flex items-center justify-center text-dark-300 hover:bg-dark-600 transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-semibold text-dark-200 w-8 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => {
                        try {
                          updateQuantity(item.id, item.quantity + 1);
                        } catch (e) {
                          toast.error(e.message);
                        }
                      }}
                      className="w-7 h-7 rounded-md bg-dark-700 flex items-center justify-center text-dark-300 hover:bg-dark-600 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-primary-400">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer */}
        {items.length > 0 && (
          <div className="border-t border-dark-700 p-4 space-y-3">
            {/* Discount */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-dark-400 whitespace-nowrap">
                Discount %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1.5 bg-dark-900 border border-dark-600 rounded-md text-sm text-dark-200 text-center focus:outline-none focus:ring-1 focus:ring-primary-500/40"
              />
            </div>

            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-dark-400">
                <span>Subtotal</span>
                <span>{formatCurrency(getSubtotal())}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Discount ({discount}%)</span>
                  <span>-{formatCurrency(getDiscountAmount())}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg text-dark-100 pt-2 border-t border-dark-700">
                <span>Total</span>
                <span className="text-primary-400">
                  {formatCurrency(getTotal())}
                </span>
              </div>
            </div>

            {/* Checkout Button */}
            <Button
              className="w-full"
              size="lg"
              icon={CreditCard}
              onClick={() => setCheckoutModal(true)}
            >
              Checkout
            </Button>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      <Modal
        isOpen={checkoutModal}
        onClose={() => setCheckoutModal(false)}
        title="Checkout"
        size="md"
      >
        <div className="space-y-5">
          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-4 gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    paymentMethod === method.id
                      ? "border-primary-500 bg-primary-600/10 text-primary-400"
                      : "border-dark-600 bg-dark-800 text-dark-400 hover:border-dark-500"
                  }`}
                >
                  <method.icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-dark-900 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-dark-400">
              <span>Subtotal</span>
              <span>{formatCurrency(getSubtotal())}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-red-400">
                <span>Discount ({discount}%)</span>
                <span>-{formatCurrency(getDiscountAmount())}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg text-dark-100 pt-2 border-t border-dark-700">
              <span>Total</span>
              <span className="text-primary-400">
                {formatCurrency(getTotal())}
              </span>
            </div>
          </div>

          {/* Amount Paid (Cash only) */}
          {paymentMethod === "cash" && (
            <div>
              <Input
                label="Amount Paid"
                type="number"
                placeholder="Enter amount..."
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                icon={Banknote}
              />
              {amountPaid && parseFloat(amountPaid) >= getTotal() && (
                <p className="mt-2 text-sm text-primary-400">
                  Change: {formatCurrency(parseFloat(amountPaid) - getTotal())}
                </p>
              )}
            </div>
          )}

          {/* Quick Cash Buttons */}
          {paymentMethod === "cash" && (
            <div className="grid grid-cols-4 gap-2">
              {[getTotal(), 50000, 100000, 200000].map((amount, idx) => (
                <button
                  key={idx}
                  onClick={() => setAmountPaid(amount.toString())}
                  className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-xs font-medium text-dark-300 hover:bg-dark-600 hover:text-dark-200 transition-colors"
                >
                  {idx === 0 ? "Exact" : formatCurrency(amount)}
                </button>
              ))}
            </div>
          )}

          {/* QRIS Info */}
          {paymentMethod === "qris" && (
            <div className="bg-dark-900 rounded-xl p-4 text-center">
              <QrCode className="h-8 w-8 text-primary-400 mx-auto mb-2" />
              <p className="text-sm text-dark-300">
                Click confirm to generate QRIS QR Code
              </p>
              <p className="text-xs text-dark-500 mt-1">
                Customer will scan the QR code to pay
              </p>
            </div>
          )}

          {/* Confirm Button */}
          <Button
            className="w-full"
            size="lg"
            loading={processing}
            onClick={
              paymentMethod === "qris" ? handleQrisPayment : handleCheckout
            }
            icon={paymentMethod === "qris" ? QrCode : CheckCircle}
          >
            {paymentMethod === "qris"
              ? "Generate QRIS Code"
              : "Confirm Payment"}
          </Button>
        </div>
      </Modal>

      {/* QRIS QR Code Modal */}
      <Modal
        isOpen={qrisModal}
        onClose={() => setQrisModal(false)}
        title="QRIS Payment"
        size="md"
      >
        <div className="text-center space-y-5">
          {/* QR Code or Custom Image */}
          <div className="bg-white rounded-2xl p-6 inline-block mx-auto">
            {settings?.qris_image_url ? (
              <img
                src={settings.qris_image_url}
                alt="QRIS Payment"
                className="w-52 h-52 object-contain"
                onError={(e) => {
                  // Fallback to generated QR if image fails
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "block";
                }}
              />
            ) : null}
            <div className={settings?.qris_image_url ? "hidden" : ""}>
              <QRCodeSVG
                value={generateQrisValue()}
                size={220}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          </div>

          {/* Payment Info */}
          <div>
            <p className="text-2xl font-bold text-primary-400">
              {formatCurrency(getTotal())}
            </p>
            <p className="text-sm text-dark-400 mt-1">
              Scan QR code with any QRIS-supported app
            </p>
          </div>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-2 text-dark-400">
            <Clock className="h-4 w-4" />
            <span className="text-sm">
              Expires in{" "}
              <span
                className={`font-mono font-bold ${qrisCountdown < 60 ? "text-red-400" : "text-dark-200"}`}
              >
                {formatCountdown(qrisCountdown)}
              </span>
            </span>
          </div>

          {/* Supported Apps */}
          <div className="bg-dark-900 rounded-xl p-3">
            <p className="text-xs text-dark-500 mb-2">Supported payment apps</p>
            <div className="flex items-center justify-center gap-3 text-xs text-dark-400">
              <span className="px-2 py-1 bg-dark-800 rounded">GoPay</span>
              <span className="px-2 py-1 bg-dark-800 rounded">OVO</span>
              <span className="px-2 py-1 bg-dark-800 rounded">DANA</span>
              <span className="px-2 py-1 bg-dark-800 rounded">ShopeePay</span>
              <span className="px-2 py-1 bg-dark-800 rounded">LinkAja</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setQrisModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              icon={CheckCircle}
              loading={processing}
              onClick={confirmQrisPayment}
            >
              Confirm Received
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Modal with Receipt Preview */}
      <Modal
        isOpen={successModal}
        onClose={() => setSuccessModal(false)}
        title="Transaction Complete"
        size="md"
      >
        <div className="space-y-4">
          {/* Success Header */}
          <div className="text-center">
            <div className="w-14 h-14 bg-primary-600/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-7 w-7 text-primary-400" />
            </div>
            <h3 className="text-lg font-bold text-dark-100">
              Payment Successful!
            </h3>
            {lastTransaction && (
              <p className="text-sm text-dark-400 mt-1">
                {lastTransaction.transaction_number}
              </p>
            )}
          </div>

          {/* Receipt Preview */}
          {lastTransaction && (
            <div className="max-h-[400px] overflow-y-auto rounded-xl border border-dark-700 p-3 bg-dark-900">
              <ReceiptPreview
                ref={receiptRef}
                transaction={lastTransaction}
                items={lastTransactionItems}
                storeSettings={settings}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setSuccessModal(false)}
            >
              Close
            </Button>
            <Button
              className="flex-1"
              icon={Printer}
              onClick={() => {
                window.print();
              }}
            >
              Print Receipt
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Cashier;
