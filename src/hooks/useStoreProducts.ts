import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface StoreProduct {
  id: string;
  product_key: string;
  name: string;
  description: string | null;
  price_ton: number;
  content_items: string[] | null;
  store_image_url: string;
  detail_image_url: string;
  is_active: boolean;
  sort_order: number;
}

export const useStoreProducts = () => {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("store_products")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const getProductByKey = (productKey: string): StoreProduct | undefined => {
    return products.find((p) => p.product_key === productKey);
  };

  return {
    products,
    loading,
    getProductByKey,
    refetch: fetchProducts,
  };
};
