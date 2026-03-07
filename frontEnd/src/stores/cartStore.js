import { create } from "zustand";

const useCartStore = create((set, get) => ({
  items: [],
  discount: 0,
  taxRate: 0,

  // Add item to cart
  addItem: (product) => {
    const { items } = get();
    const existingItem = items.find((item) => item.id === product.id);

    if (existingItem) {
      // Check stock availability
      if (existingItem.quantity >= product.stock) {
        throw new Error("Insufficient stock");
      }

      set({
        items: items.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.price,
              }
            : item,
        ),
      });
    } else {
      if (product.stock <= 0) {
        throw new Error("Product out of stock");
      }

      set({
        items: [
          ...items,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            subtotal: product.price,
            stock: product.stock,
          },
        ],
      });
    }
  },

  // Remove item from cart
  removeItem: (productId) => {
    set({
      items: get().items.filter((item) => item.id !== productId),
    });
  },

  // Update item quantity
  updateQuantity: (productId, quantity) => {
    const { items } = get();
    const item = items.find((i) => i.id === productId);

    if (!item) return;

    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    if (quantity > item.stock) {
      throw new Error("Insufficient stock");
    }

    set({
      items: items.map((i) =>
        i.id === productId
          ? { ...i, quantity, subtotal: quantity * i.price }
          : i,
      ),
    });
  },

  // Set discount (percentage)
  setDiscount: (discount) => {
    set({ discount: Math.max(0, Math.min(100, discount)) });
  },

  // Set tax rate (percentage)
  setTaxRate: (taxRate) => {
    set({ taxRate: Math.max(0, taxRate) });
  },

  // Get subtotal
  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.subtotal, 0);
  },

  // Get discount amount
  getDiscountAmount: () => {
    const subtotal = get().getSubtotal();
    return (subtotal * get().discount) / 100;
  },

  // Get tax amount
  getTaxAmount: () => {
    const subtotal = get().getSubtotal();
    const discountAmount = get().getDiscountAmount();
    return ((subtotal - discountAmount) * get().taxRate) / 100;
  },

  // Get total
  getTotal: () => {
    const subtotal = get().getSubtotal();
    const discountAmount = get().getDiscountAmount();
    const taxAmount = get().getTaxAmount();
    return subtotal - discountAmount + taxAmount;
  },

  // Clear cart
  clearCart: () => {
    set({ items: [], discount: 0, taxRate: 0 });
  },

  // Get item count
  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));

export default useCartStore;
