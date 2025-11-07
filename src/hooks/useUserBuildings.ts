import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Building {
  id: string;
  user_id: string;
  building_type: string;
  level: number;
  position_index: number;
  capacity: number;
  current_chickens: number;
  selected_skin: string | null;
  created_at: string;
  updated_at: string;
}

export const useUserBuildings = (userId: string | undefined) => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBuildings = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_buildings")
        .select("*")
        .eq("user_id", userId)
        .order("position_index");

      if (error) throw error;
      setBuildings(data || []);
    } catch (error) {
      console.error("Error fetching buildings:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los edificios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, [userId]);

  const purchaseBuilding = async (positionIndex: number) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "Usuario no identificado",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { data, error } = await supabase
        .from("user_buildings")
        .insert({
          user_id: userId,
          building_type: "corral",
          level: 1,
          position_index: positionIndex,
          capacity: 50,
          current_chickens: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setBuildings((prev) => [...prev, data]);
      
      toast({
        title: "¡Éxito!",
        description: "Corral comprado exitosamente",
      });

      return true;
    } catch (error: any) {
      console.error("Error purchasing building:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo comprar el corral",
        variant: "destructive",
      });
      return false;
    }
  };

  const upgradeBuilding = async (buildingId: string, currentLevel: number, newCapacity: number) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "Usuario no identificado",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from("user_buildings")
        .update({
          level: currentLevel + 1,
          capacity: newCapacity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", buildingId)
        .eq("user_id", userId);

      if (error) throw error;

      await fetchBuildings();
      
      toast({
        title: "¡Éxito!",
        description: "Edificio mejorado exitosamente",
      });

      return true;
    } catch (error: any) {
      console.error("Error upgrading building:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo mejorar el edificio",
        variant: "destructive",
      });
      return false;
    }
  };

  const getBuildingByType = (buildingType: string) => {
    return buildings.find((b) => b.building_type === buildingType);
  };

  return {
    buildings,
    loading,
    purchaseBuilding,
    upgradeBuilding,
    getBuildingByType,
    refetch: fetchBuildings,
  };
};
