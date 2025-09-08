// src/context/CartContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import API from "../api";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [itemCount, setItemCount] = useState(0);

  // 🔄 Obtener carrito actual al iniciar
  const refresh = async () => {
    try {
      const res = await API.get("/cart");
      setCart(res.data);
      setItemCount(res.data.items?.length || 0);
    } catch (err) {
      console.error("❌ No pude sincronizar el carrito", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Validar diseño antes de agregar
  const addToCart = async (id_diseno, qty = 1) => {
    if (!id_diseno || typeof id_diseno !== "number") {
      console.warn("⚠️ ID de diseño inválido:", id_diseno);
      return;
    }

    try {
      await API.post("/cart/items", { id_diseno, qty });
      await refresh();
    } catch (err) {
      console.error("❌ Error al agregar diseño al carrito:", err);
    }
  };

  const removeItem = async (id_diseno) => {
    try {
      await API.delete(`/cart/items/${id_diseno}`);
      await refresh();
    } catch (err) {
      console.error("❌ Error al eliminar ítem del carrito", err);
    }
  };

  const clear = async () => {
    try {
      await API.delete("/cart");
      await refresh();
    } catch (err) {
      console.error("❌ Error al vaciar el carrito", err);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const total = cart.items.reduce((acc, item) => acc + Number(item.precio || 0), 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        itemCount,
        addItem: addToCart, // alias
        addToCart,
        removeItem,
        clear,
        refresh,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
