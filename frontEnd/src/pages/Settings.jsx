import React, { useEffect, useState, useRef } from "react";

import {
  Store,
  MapPin,
  Phone,
  FileText,
  Save,
  RefreshCw,
  Eye,
  Globe,
  Percent,
  Image,
  QrCode,
  Upload,
  X,
  Check,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import useSettingsStore from "@/stores/settingsStore";
import toast from "react-hot-toast";

const Settings = () => {
  const { settings, loading, fetchSettings, updateSettings } =
    useSettingsStore();
  const isMounted = useRef(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    store_name: "",
    address: "",
    phone: "",
    footer_message: "",
    logo_url: "",
    qris_image_url: "",
    currency: "IDR",
    tax_rate: "0",
  });

  useEffect(() => {
    // Set mounted to true on mount
    isMounted.current = true;

    fetchSettings();

    // Cleanup: set mounted to false on unmount
    return () => {
      isMounted.current = false;
    };
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setFormData({
        store_name: settings.store_name || "",
        address: settings.address || "",
        phone: settings.phone || "",
        footer_message: settings.footer_message || "",
        logo_url: settings.logo_url || "",
        qris_image_url: settings.qris_image_url || "",
        currency: settings.currency || "IDR",
        tax_rate: settings.tax_rate?.toString() || "0",
      });
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updates = {
        store_name: formData.store_name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        footer_message: formData.footer_message.trim(),
        logo_url: formData.logo_url.trim() || null,
        qris_image_url: formData.qris_image_url.trim() || null,
        currency: formData.currency,
        tax_rate: parseFloat(formData.tax_rate) || 0,
      };

      const { error } = await updateSettings(updates);
      if (error) throw error;

      toast.success("Store settings updated successfully!");
    } catch (error) {
      console.error("Settings save error:", error);
      toast.error(error?.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-8 animate-pulse">
          <div className="h-6 w-48 bg-dark-700 rounded mb-6" />
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-dark-100">Store Settings</h2>
          <p className="text-sm text-dark-500 mt-0.5">
            Configure your store information and receipt branding
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={Eye}
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? "Hide Preview" : "Receipt Preview"}
          </Button>
        </div>
      </div>

      <div
        className={`grid gap-6 ${showPreview ? "grid-cols-1 lg:grid-cols-5" : "grid-cols-1"}`}
      >
        {/* Settings Form */}
        <div className={showPreview ? "lg:col-span-3" : ""}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Store Information */}
            <Card>
              <Card.Header>
                <div>
                  <Card.Title>Store Information</Card.Title>
                  <Card.Description>
                    Basic details about your store
                  </Card.Description>
                </div>
                <Store className="h-5 w-5 text-dark-500" />
              </Card.Header>
              <Card.Content>
                <div className="space-y-4">
                  <Input
                    label="Store Name"
                    placeholder="Enter your store name"
                    icon={Store}
                    value={formData.store_name}
                    onChange={(e) => handleChange("store_name", e.target.value)}
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">
                      Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-dark-500" />
                      <textarea
                        placeholder="Enter store address"
                        value={formData.address}
                        onChange={(e) =>
                          handleChange("address", e.target.value)
                        }
                        rows={3}
                        className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 resize-none"
                      />
                    </div>
                  </div>
                  <Input
                    label="Phone Number"
                    placeholder="+62 812-3456-7890"
                    icon={Phone}
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                  />
                  <Input
                    label="Logo URL"
                    placeholder="https://example.com/logo.png"
                    icon={Image}
                    value={formData.logo_url}
                    onChange={(e) => handleChange("logo_url", e.target.value)}
                  />
                  <Input
                    label="QRIS Image URL"
                    placeholder="https://example.com/qris.png"
                    icon={QrCode}
                    value={formData.qris_image_url}
                    onChange={(e) =>
                      handleChange("qris_image_url", e.target.value)
                    }
                  />
                  {formData.qris_image_url && (
                    <div className="mt-2 p-3 bg-dark-700 rounded-lg">
                      <p className="text-xs text-dark-400 mb-2">
                        QRIS Preview:
                      </p>
                      <img
                        src={formData.qris_image_url}
                        alt="QRIS Preview"
                        className="h-32 mx-auto object-contain"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              </Card.Content>
            </Card>

            {/* Receipt & Financial */}
            <Card>
              <Card.Header>
                <div>
                  <Card.Title>Receipt & Financial</Card.Title>
                  <Card.Description>
                    Configure receipt footer and financial settings
                  </Card.Description>
                </div>
                <FileText className="h-5 w-5 text-dark-500" />
              </Card.Header>
              <Card.Content>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">
                      Currency
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
                      <select
                        value={formData.currency}
                        onChange={(e) =>
                          handleChange("currency", e.target.value)
                        }
                        className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-sm text-dark-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 appearance-none"
                      >
                        <option value="IDR">IDR - Indonesian Rupiah</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="MYR">MYR - Malaysian Ringgit</option>
                        <option value="SGD">SGD - Singapore Dollar</option>
                      </select>
                    </div>
                  </div>
                  <Input
                    label="Tax Rate (%)"
                    type="number"
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.5"
                    icon={Percent}
                    value={formData.tax_rate}
                    onChange={(e) => handleChange("tax_rate", e.target.value)}
                  />
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">
                      Receipt Footer Message
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-dark-500" />
                      <textarea
                        placeholder="Thank you for your purchase!"
                        value={formData.footer_message}
                        onChange={(e) =>
                          handleChange("footer_message", e.target.value)
                        }
                        rows={2}
                        className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-sm text-dark-200 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 resize-none"
                      />
                    </div>
                  </div>
                </div>
              </Card.Content>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                type="button"
                icon={RefreshCw}
                onClick={() => fetchSettings()}
              >
                Reset
              </Button>
              <Button type="submit" icon={Save} loading={saving}>
                Save Settings
              </Button>
            </div>
          </form>
        </div>

        {/* Live Receipt Preview */}
        {showPreview && (
          <div className="lg:col-span-2">
            <div className="sticky top-6">
              <Card>
                <Card.Header>
                  <Card.Title className="text-base">Receipt Preview</Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="bg-white rounded-lg p-6 text-black font-mono text-xs leading-relaxed">
                    {/* Receipt Header */}
                    <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
                      {formData.logo_url && (
                        <img
                          src={formData.logo_url}
                          alt="Logo"
                          className="h-10 mx-auto mb-2 object-contain"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      )}
                      <p className="font-bold text-sm">
                        {formData.store_name || "Store Name"}
                      </p>
                      {formData.address && (
                        <p className="text-gray-600 mt-0.5">
                          {formData.address}
                        </p>
                      )}
                      {formData.phone && (
                        <p className="text-gray-600">Tel: {formData.phone}</p>
                      )}
                    </div>

                    {/* Receipt Body */}
                    <div className="border-b border-dashed border-gray-300 pb-3 mb-3">
                      <div className="flex justify-between">
                        <span>No: TRX-20240101-001</span>
                        <span>01/01/2024</span>
                      </div>
                      <p>Cashier: Admin</p>
                    </div>

                    {/* Items */}
                    <div className="border-b border-dashed border-gray-300 pb-3 mb-3 space-y-1">
                      <div className="flex justify-between">
                        <span>Sample Product A</span>
                        <span></span>
                      </div>
                      <div className="flex justify-between text-gray-600 pl-2">
                        <span>2 x Rp 25.000</span>
                        <span>Rp 50.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sample Product B</span>
                        <span></span>
                      </div>
                      <div className="flex justify-between text-gray-600 pl-2">
                        <span>1 x Rp 15.000</span>
                        <span>Rp 15.000</span>
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="space-y-1 border-b border-dashed border-gray-300 pb-3 mb-3">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>Rp 65.000</span>
                      </div>
                      {parseFloat(formData.tax_rate) > 0 && (
                        <div className="flex justify-between">
                          <span>Tax ({formData.tax_rate}%)</span>
                          <span>
                            Rp{" "}
                            {Math.round(
                              65000 * (parseFloat(formData.tax_rate) / 100),
                            ).toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-sm pt-1">
                        <span>TOTAL</span>
                        <span>
                          Rp{" "}
                          {Math.round(
                            65000 *
                              (1 + parseFloat(formData.tax_rate || 0) / 100),
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cash</span>
                        <span>Rp 100.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Change</span>
                        <span>
                          Rp{" "}
                          {(
                            100000 -
                            Math.round(
                              65000 *
                                (1 + parseFloat(formData.tax_rate || 0) / 100),
                            )
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-gray-500">
                      <p>
                        {formData.footer_message ||
                          "Thank you for your purchase!"}
                      </p>
                      <p className="mt-1">Powered by KasirPOS</p>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
