import { useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetCartQueryKey,
  getGetWishlistQueryKey,
  useAddCartItem,
  useAddWishlistItem,
  useGetWishlist,
  useRemoveWishlistItem,
  type Product,
} from '@workspace/api-client-react';
import { toArray } from '@/utils/array';
import { toast } from '@/hooks/use-toast';

export function useProductActions() {
  const qc = useQueryClient();
  const addCart = useAddCartItem();
  const addWish = useAddWishlistItem();
  const removeWish = useRemoveWishlistItem();
  const wishlist = useGetWishlist();
  const addPending = useRef(false);

  const savedIds = useMemo(
    () => new Set(toArray<{ id: string | number }>(wishlist.data).map((item) => item.id)),
    [wishlist.data]
  );

  const save = (product: Product) => {
    if (savedIds.has(product.id)) {
      removeWish.mutate(
        { productId: product.id },
        { onSuccess: () => qc.invalidateQueries({ queryKey: getGetWishlistQueryKey() }) }
      );
    } else {
      addWish.mutate(
        { data: { productId: product.id } },
        { onSuccess: () => qc.invalidateQueries({ queryKey: getGetWishlistQueryKey() }) }
      );
    }
  };

  const add = (product: Product) => {
    if (addPending.current || product.stock === 0) return;
    addPending.current = true;
    addCart.mutate(
      { data: { productId: product.id, quantity: 1 } },
      {
        onSuccess: (updatedCart) => {
          qc.setQueryData(getGetCartQueryKey(), updatedCart);
          void qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
          toast({ title: 'Added to your cart', description: product.name });
        },
        onError: (error) => {
          toast({
            title: 'Could not add this item',
            description: error instanceof Error ? error.message : 'Please try again.',
            variant: 'destructive',
          });
        },
        onSettled: () => {
          addPending.current = false;
        },
      }
    );
  };

  return { savedIds, save, add, adding: addCart.isPending };
}

export default useProductActions;
