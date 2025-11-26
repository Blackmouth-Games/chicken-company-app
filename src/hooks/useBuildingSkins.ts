import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BuildingSkin {
  id: string;
  building_type: string;
  skin_key: string;
  name: string;
  image_url: string;
  is_default: boolean;
  rarity: string;
}

export const useBuildingSkins = (buildingType?: string) => {
  const [skins, setSkins] = useState<BuildingSkin[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSkins = async () => {
    try {
      let query = supabase.from("building_skins").select("*");
      
      if (buildingType) {
        query = query.eq("building_type", buildingType as any);
      }

      const { data, error } = await query.order("rarity").order("name");

      if (error) throw error;
      setSkins(data || []);
    } catch (error) {
      console.error("Error fetching skins:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las skins",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkins();
  }, [buildingType]);

  // Get skin by key
  const getSkinByKey = (skinKey: string | null | undefined): BuildingSkin | null => {
    if (!skinKey) return null;
    return skins.find(s => s.skin_key === skinKey) || null;
  };

  return {
    skins,
    loading,
    refetch: fetchSkins,
    getSkinByKey,
  };
};
