// src/context/CartContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import API from "../api";

const CartCtx = createContext();
const LS_KEY = "z3d_cart_v1";

// util: map -> objeto por id, mergea sin duplicar
const dedupe = (arr) => {
  const map = new Map();
  for (const it of arr) {
    map.set(it.id_diseno, { ...it, qty: 1 }); // qty fijo en 1
  }
  return Array.from(map.values());
};

export function CartProvider({ children }) {
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(true);

  // 1) Cargar desde localStorage al inicio
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setCart({ items: dedupe(parsed.items || []) });
      }
    } catch { /* me ahorro el drama */ }
  }, []);

  // 2) Si estoy logueado, sincronizar con backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const { data } = await API.get("/cart"); // debe devolver [{id_diseno,titulo,precio,portada_url,id_creador}]
          const serverItems = dedupe(data.items || []);
          // merge con lo que haya en LS (cliente manda prioridad si había algo)
          setCart(prev => {
            const merged = dedupe([...(prev.items || []), ...serverItems]);
            return { items: merged };
          });
        }
      } catch (e) {
        console.error("No pude sincronizar el carrito", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 3) Guardar siempre en localStorage
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(cart)); } catch {}
  }, [cart]);

  const addItem = async (it) => {
    setCart(prev => {
      const exists = prev.items.some(x => x.id_diseno === it.id_diseno);
      if (exists) return prev; // no duplicar
      return { items: [...prev.items, { ...it, qty: 1 }] };
    });
    // best effort backend
    try { await API.post("/cart", { id_diseno: it.id_diseno }); } catch {}
  };

  const removeItem = async (id_diseno) => {
    setCart(prev => ({ items: prev.items.filter(x => x.id_diseno !== id_diseno) }));
    try { await API.delete(`/cart/${id_diseno}`); } catch {}
  };

  const clear = async () => {
    setCart({ items: [] });
    try { await API.delete("/cart"); } catch {}
  };

  const total = useMemo(
    () => cart.items.reduce((acc, it) => acc + Number(it.precio || 0), 0),
    [cart.items]
  );

  const value = { loading, cart, addItem, removeItem, clear, total };
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => useContext(CartCtx);
