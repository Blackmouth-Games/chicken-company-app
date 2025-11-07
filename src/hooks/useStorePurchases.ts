import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StorePurchase {
  id: string;
  user_id: string;
  product_id: string;
  product_key: string;
  price_ton: number;
  status: string;
  wallet_address: string | null;
  transaction_hash: string | null;
  created_at: string;
  completed_at: string | null;
  metadata: any;
}

export const useStorePurchases = (userId: string | undefined) => {
  const [purchases, setPurchases] = useState<StorePurchase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPurchases = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('store_purchases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Error fetching store purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [userId]);

  return {
    purchases,
    loading,
    refetch: fetchPurchases,
  };
};
