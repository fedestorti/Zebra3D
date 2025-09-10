// context/CartContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import API from '../api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export function CartProvider({ children }) {
  const { usuario, loading: authLoading } = useAuth();
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/cart');
      setCart(data);
    } catch (err) {
      console.error('❌ No pude sincronizar el carrito ', err);
      setCart({ items: [] });
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (id_diseno) => {
    try {
      await API.post('/cart/items', { id_diseno, qty: 1 });
      await refresh();
    } catch (err) {
      console.error("❌ Error al agregar item al carrito", err);
      throw err;
    }
  };

  const removeItem = async (id_diseno) => {
    try {
      await API.delete(`/cart/items/${id_diseno}`);
      await refresh();
    } catch (err) {
      console.error("❌ Error al eliminar item del carrito", err);
    }
  };

  const clear = async () => {
    try {
      await API.delete(`/cart`);
      await refresh();
    } catch (err) {
      console.error("❌ Error al vaciar el carrito", err);
    }
  };

  useEffect(() => {
    if (!authLoading && usuario) refresh();
    if (!authLoading && !usuario) setCart({ items: [] });
  }, [authLoading, usuario]);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        refresh,
        addItem,
        removeItem,
        clear,
        total: cart.items.reduce((acc, it) => acc + Number(it.precio || 0), 0),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
