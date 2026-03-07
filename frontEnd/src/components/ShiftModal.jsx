import React, { useState, useEffect } from "react";
import { DollarSign, CheckCircle, Briefcase } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import useShiftStore from "@/stores/shiftStore";
import useAuthStore from "@/stores/authStore";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/generateTransactionNumber";

const ShiftModal = ({ isOpen, onClose, onShiftOpened }) => {
  const { user } = useAuthStore();
  const { currentShift, loading, openShift, closeShift, getShiftSummary } =
    useShiftStore();

  const [mode, setMode] = useState("open");
  const [startingCash, setStartingCash] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");
  const [shiftSummary, setShiftSummary] = useState(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      useShiftStore.getState().fetchCurrentShift(user.id);
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (currentShift) {
      setMode("close");
      loadShiftSummary();
    } else {
      setMode("open");
    }
  }, [currentShift]);

  const loadShiftSummary = async () => {
    if (currentShift) {
      const summary = await getShiftSummary(currentShift.id);
      setShiftSummary(summary);
      setActualCash(summary?.expectedCash?.toString() || "");
    }
  };

  const handleOpenShift = async () => {
    const cash = parseFloat(startingCash) || 0;
    const result = await openShift(user.id, cash);
    if (result.success) {
      onShiftOpened?.();
      onClose();
    }
  };

  const handleCloseShift = async () => {
    setClosing(true);
    const cash = parseFloat(actualCash) || 0;
    const result = await closeShift(currentShift.id, cash, notes);
    setClosing(false);
    if (result.success) {
      onClose();
    }
  };

  const renderOpenShift = () => (
    <div className="space-y-5">
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-primary-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Briefcase className="h-8 w-8 text-primary-400" />
        </div>
        <h3 className="text-lg font-bold text-dark-100">Start Your Shift</h3>
        <p className="text-sm text-dark-400 mt-1">
          Enter the starting cash in the drawer
        </p>
      </div>

      <div className="bg-dark-900 rounded-xl p-4">
        <Input
          label="Starting Cash"
          type="number"
          placeholder="Enter starting cash amount..."
          value={startingCash}
          onChange={(e) => setStartingCash(e.target.value)}
          icon={DollarSign}
        />
        <p className="text-xs text-dark-500 mt-2">
          This amount will be used to calculate cash differences at end of shift
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[0, 50000, 100000, 200000].map((amount) => (
          <button
            key={amount}
            onClick={() => setStartingCash(amount.toString())}
            className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-xs font-medium text-dark-300 hover:bg-dark-600 hover:text-dark-200 transition-colors"
          >
            {amount === 0 ? "None" : formatCurrency(amount)}
          </button>
        ))}
      </div>

      <Button
        className="w-full"
        size="lg"
        icon={CheckCircle}
        loading={loading}
        onClick={handleOpenShift}
      >
        Open Cashier
      </Button>
    </div>
  );

  const renderCloseShift = () => (
    <div className="space-y-5">
      {currentShift && (
        <div className="bg-dark-900 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-400">Shift Started</span>
            <span className="text-sm text-dark-200">
              {formatDate(currentShift.start_time)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-400">Starting Cash</span>
            <span className="text-sm text-dark-200">
              {formatCurrency(currentShift.starting_cash)}
            </span>
          </div>
          {shiftSummary && (
            <>
              <div className="border-t border-dark-700 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">Total Sales</span>
                  <span className="text-sm font-semibold text-primary-400">
                    {formatCurrency(shiftSummary.shift.total_sales)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-dark-400">Transactions</span>
                  <span className="text-sm text-dark-200">
                    {shiftSummary.shift.total_transactions}
                  </span>
                </div>
              </div>
              <div className="border-t border-dark-700 pt-3">
                <span className="text-xs text-dark-500 mb-2 block">
                  Payment Breakdown
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(shiftSummary.paymentBreakdown).map(
                    ([method, amount]) => (
                      <div
                        key={method}
                        className="bg-dark-800 rounded-lg p-2 text-center"
                      >
                        <p className="text-xs text-dark-500 capitalize">
                          {method}
                        </p>
                        <p className="text-sm font-semibold text-dark-200">
                          {formatCurrency(amount)}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="bg-dark-900 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-dark-400">Expected Cash</span>
          <span className="text-sm font-semibold text-dark-200">
            {formatCurrency(shiftSummary?.expectedCash || 0)}
          </span>
        </div>
        <Input
          label="Actual Cash Count"
          type="number"
          placeholder="Count the cash in drawer..."
          value={actualCash}
          onChange={(e) => setActualCash(e.target.value)}
          icon={DollarSign}
        />
        {actualCash && shiftSummary && (
          <div
            className={`flex items-center justify-between p-3 rounded-lg ${
              parseFloat(actualCash) === shiftSummary.expectedCash
                ? "bg-primary-600/10"
                : parseFloat(actualCash) > shiftSummary.expectedCash
                  ? "bg-green-600/10"
                  : "bg-red-600/10"
            }`}
          >
            <span className="text-sm text-dark-400">Difference</span>
            <span
              className={`text-sm font-bold ${
                parseFloat(actualCash) === shiftSummary.expectedCash
                  ? "text-primary-400"
                  : parseFloat(actualCash) > shiftSummary.expectedCash
                    ? "text-green-400"
                    : "text-red-400"
              }`}
            >
              {parseFloat(actualCash) > shiftSummary.expectedCash ? "+" : ""}
              {formatCurrency(
                parseFloat(actualCash) - shiftSummary.expectedCash,
              )}
            </span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-dark-300 mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any observations or notes..."
          className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none"
          rows={2}
        />
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          icon={CheckCircle}
          loading={closing}
          onClick={handleCloseShift}
        >
          Close Shift
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "open" ? "Open Shift" : "Close Shift"}
      size="md"
    >
      {mode === "open" ? renderOpenShift() : renderCloseShift()}
    </Modal>
  );
};

export default ShiftModal;
