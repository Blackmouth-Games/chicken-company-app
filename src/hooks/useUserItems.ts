import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UserItem {
  id: string;
  user_id: string;
  item_type: string;
  item_key: string;
  quantity: number;
  acquired_at: string;
}

export const useUserItems = (userId: string | undefined) => {
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchItems = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_items")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching user items:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [userId]);

  const hasItem = (itemType: string, itemKey: string): boolean => {
    return items.some((item) => item.item_type === itemType && item.item_key === itemKey);
  };

  return {
    items,
    loading,
    hasItem,
    refetch: fetchItems,
  };
};
