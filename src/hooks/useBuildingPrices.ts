import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BuildingPrice {
  id: string;
  building_type: string;
  level: number;
  price_ton: number;
  capacity: number;
  created_at: string;
  updated_at: string;
}

export const useBuildingPrices = () => {
  const [prices, setPrices] = useState<BuildingPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPrices = async () => {
    try {
      const { data, error } = await supabase
        .from("building_prices")
        .select("*")
        .order("building_type")
        .order("level");

      if (error) throw error;
      setPrices(data || []);
    } catch (error) {
      console.error("Error fetching prices:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los precios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const getPrice = (buildingType: string, level: number): BuildingPrice | undefined => {
    return prices.find(
      (p) => p.building_type === buildingType && p.level === level
    );
  };

  return {
    prices,
    loading,
    getPrice,
    refetch: fetchPrices,
  };
};
