// src/hooks/useAddToCart.js
import { useCart } from "../context/CartContext";

export default function useAddToCart() {
  const { addToCart } = useCart();

  return (disenoId, cantidad = 1) => {
    addToCart(disenoId, cantidad);
  };
}