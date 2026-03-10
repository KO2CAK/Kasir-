import React, { useEffect, useState, useRef } from "react";
import {
  Search,
  Receipt,
  Eye,
  Printer,
  FileText,
  AlertTriangle,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import ReceiptPreview from "@/components/ReceiptPreview";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate, formatDateShort } from "@/utils/generateTransactionNumber";
import { useVisibilityHandler } from "@/hooks/useVisibilityHandler";
import useSettingsStore from "@/stores/settingsStore";
import useAuthStore from "@/stores/authStore";
import toast from "react-hot-toast";

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionItems, setTransactionItems] = useState([]);
  const [detailModal, setDetailModal] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [detailTab, setDetailTab] = useState("details");
  const receiptRef = useRef(null);
  const isMounted = useRef(true);
  const { settings, fetchSettings } = useSettingsStore();
  const { isAdmin } = useAuthStore();
  const [voidModal, setVoidModal] = useState(false);
  const [voiding, setVoiding] = useState(false);

  // Handle visibility change - refresh data when tab becomes visible
  useVisibilityHandler(() => {
    if (!loading && isMounted.current) {
      fetchTransactions();
    }
  });

  useEffect(() => {
    isMounted.current = true;
    fetchTransactions();
    if (!settings) fetchSettings();

    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchTransactions = async () => {
    if (!isMounted.current) return;

    try {
      // Don't filter by user_id - let RLS handle visibility
      // RLS will return:
      // - For admin: their own transactions (user_id = admin_id)
      // - For cashier: transactions where they are the cashier OR their owner's transactions
      const { data, error } = await supabase
        .from("transactions")
        .select("*, profiles!transactions_cashier_id_fkey(full_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (isMounted.current) {
        setTransactions(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const viewTransaction = async (transaction) => {
    setSelectedTransaction(transaction);

    try {
      const { data, error } = await supabase
        .from("transaction_items")
        .select("*")
        .eq("transaction_id", transaction.id);

      if (error) throw error;
      setTransactionItems(data || []);
    } catch (error) {
      console.error("Failed to fetch transaction items:", error);
      setTransactionItems([]);
    }

    setDetailModal(true);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleVoidTransaction = async () => {
    if (!selectedTransaction) return;

    setVoiding(true);
    try {
      const { error } = await supabase.rpc("void_transaction", {
        p_transaction_id: selectedTransaction.id,
      });

      if (error) throw error;

      toast.success(
        "Transaction voided successfully! Stock has been restored.",
      );
      setVoidModal(false);
      fetchTransactions();

      const { data: updatedTx } = await supabase
        .from("transactions")
        .select("*, profiles!transactions_cashier_id_fkey(full_name)")
        .eq("id", selectedTransaction.id)
        .single();

      if (updatedTx && isMounted.current) {
        setSelectedTransaction(updatedTx);
      }
    } catch (error) {
      console.error("Error voiding transaction:", error);
      toast.error(error.message || "Failed to void transaction");
    } finally {
      if (isMounted.current) {
        setVoiding(false);
      }
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = tx.transaction_number
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    if (dateFilter === "all") return matchesSearch;

    const txDate = new Date(tx.created_at);
    const now = new Date();

    if (dateFilter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return matchesSearch && txDate >= today;
    }

    if (dateFilter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return matchesSearch && txDate >= weekAgo;
    }

    if (dateFilter === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return matchesSearch && txDate >= monthAgo;
    }

    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:max-w-xs">
            <Input
              placeholder="Search by transaction number..."
              icon={Search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-sm text-dark-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        <div className="text-sm text-dark-400">
          {filteredTransactions.length} transaction(s)
        </div>
      </div>

      {/* Transactions Table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  Transaction #
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  Cashier
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  Payment
                </th>
                <th className="text-right py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  Subtotal
                </th>
                <th className="text-right py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  Discount
                </th>
                <th className="text-right py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  Total
                </th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center">
                    <Receipt className="h-12 w-12 text-dark-700 mx-auto mb-3" />
                    <p className="text-dark-500 text-sm">
                      No transactions found
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-dark-800/50 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <span className="text-sm font-mono text-primary-400">
                        {tx.transaction_number}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-dark-300">
                        {tx.profiles?.full_name || "Unknown"}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-dark-700 text-dark-300 capitalize">
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm text-dark-300">
                        {formatCurrency(tx.subtotal)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm text-red-400">
                        {tx.discount > 0
                          ? `-${formatCurrency(tx.discount)}`
                          : "-"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm font-semibold text-primary-400">
                        {formatCurrency(tx.total)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          tx.status === "void"
                            ? "bg-red-600/10 text-red-400"
                            : "bg-green-600/10 text-green-400"
                        }`}
                      >
                        {tx.status || "completed"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-xs text-dark-500">
                        {formatDateShort(tx.created_at)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => viewTransaction(tx)}
                          className="p-2 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-400/10 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {isAdmin() && tx.status !== "void" && (
                          <button
                            onClick={() => {
                              setSelectedTransaction(tx);
                              setVoidModal(true);
                            }}
                            className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Void Transaction"
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Transaction Detail Modal */}
      <Modal
        isOpen={detailModal}
        onClose={() => {
          setDetailModal(false);
          setDetailTab("details");
        }}
        title="Transaction Details"
        size="lg"
      >
        {selectedTransaction && (
          <div className="space-y-5">
            {/* Tab Switcher */}
            <div className="flex bg-dark-900 rounded-lg p-1">
              <button
                onClick={() => setDetailTab("details")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  detailTab === "details"
                    ? "bg-dark-700 text-dark-100 shadow-sm"
                    : "text-dark-400 hover:text-dark-300"
                }`}
              >
                <FileText className="h-4 w-4" />
                Details
              </button>
              <button
                onClick={() => setDetailTab("receipt")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  detailTab === "receipt"
                    ? "bg-dark-700 text-dark-100 shadow-sm"
                    : "text-dark-400 hover:text-dark-300"
                }`}
              >
                <Receipt className="h-4 w-4" />
                Receipt Preview
              </button>
            </div>

            {/* Details Tab */}
            {detailTab === "details" && (
              <>
                {/* Transaction Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-dark-900 rounded-lg p-3">
                    <p className="text-xs text-dark-500 mb-1">Transaction #</p>
                    <p className="text-sm font-mono text-primary-400">
                      {selectedTransaction.transaction_number}
                    </p>
                  </div>
                  <div className="bg-dark-900 rounded-lg p-3">
                    <p className="text-xs text-dark-500 mb-1">Date</p>
                    <p className="text-sm text-dark-200">
                      {formatDate(selectedTransaction.created_at)}
                    </p>
                  </div>
                  <div className="bg-dark-900 rounded-lg p-3">
                    <p className="text-xs text-dark-500 mb-1">Cashier</p>
                    <p className="text-sm text-dark-200">
                      {selectedTransaction.profiles?.full_name || "Unknown"}
                    </p>
                  </div>
                  <div className="bg-dark-900 rounded-lg p-3">
                    <p className="text-xs text-dark-500 mb-1">Payment Method</p>
                    <p className="text-sm text-dark-200 capitalize">
                      {selectedTransaction.payment_method}
                    </p>
                  </div>
                  {selectedTransaction.status === "void" && (
                    <div className="col-span-2 bg-red-600/10 border border-red-600/20 rounded-lg p-3">
                      <p className="text-sm text-red-400 font-medium">
                        ⚠️ This transaction has been voided
                      </p>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div>
                  <h4 className="text-sm font-semibold text-dark-300 mb-3">
                    Items
                  </h4>
                  <div className="bg-dark-900 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-dark-700">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400">
                            Product
                          </th>
                          <th className="text-right py-3 px-4 text-xs font-semibold text-dark-400">
                            Price
                          </th>
                          <th className="text-right py-3 px-4 text-xs font-semibold text-dark-400">
                            Qty
                          </th>
                          <th className="text-right py-3 px-4 text-xs font-semibold text-dark-400">
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-800">
                        {transactionItems.map((item) => (
                          <tr key={item.id}>
                            <td className="py-3 px-4 text-sm text-dark-200">
                              {item.product_name}
                            </td>
                            <td className="py-3 px-4 text-sm text-dark-400 text-right">
                              {formatCurrency(item.product_price)}
                            </td>
                            <td className="py-3 px-4 text-sm text-dark-400 text-right">
                              {item.quantity}
                            </td>
                            <td className="py-3 px-4 text-sm font-semibold text-dark-200 text-right">
                              {formatCurrency(item.subtotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-dark-900 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm text-dark-400">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedTransaction.subtotal)}</span>
                  </div>
                  {selectedTransaction.discount > 0 && (
                    <div className="flex justify-between text-sm text-red-400">
                      <span>Discount</span>
                      <span>
                        -{formatCurrency(selectedTransaction.discount)}
                      </span>
                    </div>
                  )}
                  {selectedTransaction.tax > 0 && (
                    <div className="flex justify-between text-sm text-dark-400">
                      <span>Tax</span>
                      <span>{formatCurrency(selectedTransaction.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg text-dark-100 pt-2 border-t border-dark-700">
                    <span>Total</span>
                    <span className="text-primary-400">
                      {formatCurrency(selectedTransaction.total)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-dark-400 pt-1">
                    <span>Amount Paid</span>
                    <span>
                      {formatCurrency(selectedTransaction.amount_paid)}
                    </span>
                  </div>
                  {selectedTransaction.change_amount > 0 && (
                    <div className="flex justify-between text-sm text-primary-400">
                      <span>Change</span>
                      <span>
                        {formatCurrency(selectedTransaction.change_amount)}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Receipt Tab */}
            {detailTab === "receipt" && (
              <div className="flex justify-center">
                <div className="max-h-[500px] overflow-y-auto rounded-xl border border-dark-700 p-3 bg-dark-900">
                  <ReceiptPreview
                    ref={receiptRef}
                    transaction={{
                      ...selectedTransaction,
                      cashier_name:
                        selectedTransaction.profiles?.full_name || "Cashier",
                    }}
                    items={transactionItems}
                    storeSettings={settings}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-2">
              {isAdmin() && selectedTransaction?.status !== "void" && (
                <Button
                  variant="danger"
                  icon={AlertTriangle}
                  onClick={() => setVoidModal(true)}
                >
                  Void Transaction
                </Button>
              )}
              <div className="flex gap-3 ml-auto">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDetailModal(false);
                    setDetailTab("details");
                  }}
                >
                  Close
                </Button>
                <Button icon={Printer} onClick={handlePrintReceipt}>
                  Print Receipt
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Void Confirmation Modal */}
      <Modal
        isOpen={voidModal}
        onClose={() => setVoidModal(false)}
        title="Void Transaction"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-600/10 border border-red-600/20 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-400">
                Warning: This action cannot be undone!
              </p>
              <p className="text-xs text-dark-400 mt-1">
                Voiding this transaction will restore the stock for all items.
              </p>
            </div>
          </div>

          <div className="bg-dark-900 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Transaction #:</span>
              <span className="text-dark-200 font-mono">
                {selectedTransaction?.transaction_number}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Total:</span>
              <span className="text-dark-200 font-semibold">
                {selectedTransaction &&
                  formatCurrency(selectedTransaction.total)}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setVoidModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleVoidTransaction}
              loading={voiding}
              className="flex-1"
            >
              Yes, Void It
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Transactions;
