import React, { forwardRef } from "react";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/generateTransactionNumber";

const ReceiptPreview = forwardRef(
  ({ transaction, items, storeSettings, onPrint }, ref) => {
    const store = storeSettings || {
      store_name: "KasirPOS Store",
      address: "",
      phone: "",
      footer_message: "Thank you for your purchase!",
    };

    if (!transaction) return null;

    const handlePrint = () => {
      if (onPrint) {
        onPrint();
      } else {
        window.print();
      }
    };

    return (
      <div>
        {/* Print Button (hidden in print) */}
        <div className="print:hidden flex justify-center mb-4">
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            🖨️ Print Receipt
          </button>
        </div>

        {/* Receipt Container */}
        <div
          ref={ref}
          id="receipt-content"
          className="receipt-paper bg-white text-black font-mono text-[11px] leading-relaxed mx-auto"
          style={{ width: "302px", padding: "16px 12px" }}
        >
          {/* Store Header */}
          <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
            {store.logo_url && (
              <img
                src={store.logo_url}
                alt="Logo"
                className="h-10 mx-auto mb-2 object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            )}
            <p className="font-bold text-sm tracking-wide">
              {store.store_name}
            </p>
            {store.address && (
              <p className="text-[10px] text-gray-600 mt-0.5 whitespace-pre-line">
                {store.address}
              </p>
            )}
            {store.phone && (
              <p className="text-[10px] text-gray-600">Tel: {store.phone}</p>
            )}
          </div>

          {/* Transaction Info */}
          <div className="border-b border-dashed border-gray-400 pb-2 mb-2 space-y-0.5">
            <div className="flex justify-between">
              <span>No:</span>
              <span className="font-semibold">
                {transaction.transaction_number}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDate(transaction.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>
                {transaction.profiles?.full_name ||
                  transaction.cashier_name ||
                  "Cashier"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Payment:</span>
              <span className="uppercase font-semibold">
                {transaction.payment_method}
              </span>
            </div>
          </div>

          {/* Separator */}
          <div className="text-center text-gray-400 text-[10px] mb-2">
            ================================
          </div>

          {/* Items */}
          <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
            {(items || []).map((item, index) => (
              <div key={index} className="mb-1.5">
                <p className="font-medium truncate">{item.product_name}</p>
                <div className="flex justify-between text-gray-600 pl-1">
                  <span>
                    {item.quantity} x {formatCurrency(item.product_price)}
                  </span>
                  <span className="font-medium text-black">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Separator */}
          <div className="text-center text-gray-400 text-[10px] mb-2">
            ================================
          </div>

          {/* Totals */}
          <div className="space-y-0.5 mb-3">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(transaction.subtotal)}</span>
            </div>
            {transaction.discount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Discount</span>
                <span>-{formatCurrency(transaction.discount)}</span>
              </div>
            )}
            {transaction.tax > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>{formatCurrency(transaction.tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-300">
              <span>TOTAL</span>
              <span>{formatCurrency(transaction.total)}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span>Paid</span>
              <span>{formatCurrency(transaction.amount_paid)}</span>
            </div>
            {transaction.change_amount > 0 && (
              <div className="flex justify-between font-semibold">
                <span>Change</span>
                <span>{formatCurrency(transaction.change_amount)}</span>
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="text-center text-gray-400 text-[10px] mb-2">
            ================================
          </div>

          {/* Footer */}
          <div className="text-center text-[10px] text-gray-500 space-y-1">
            <p className="font-medium">
              {store.footer_message || "Thank you for your purchase!"}
            </p>
            <p className="text-gray-400">Powered by KasirPOS</p>
          </div>
        </div>
      </div>
    );
  },
);

ReceiptPreview.displayName = "ReceiptPreview";

export default ReceiptPreview;
