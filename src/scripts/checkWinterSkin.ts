import { supabase } from "@/integrations/supabase/client";
import { getTelegramUser } from "@/lib/telegram";

/**
 * Script para verificar si el usuario tiene la skin de invierno
 */
export const checkWinterSkin = async () => {
  try {
    const telegramUser = getTelegramUser();
    
    if (!telegramUser?.id) {
      console.log("❌ No se pudo obtener el usuario de Telegram");
      return {
        hasWinterSkin: false,
        userId: null,
        winterSkins: [],
        userItems: [],
        error: "No Telegram user found"
      };
    }

    console.log("🔍 Buscando perfil del usuario...");
    
    // Obtener el perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramUser.id)
      .single();

    if (profileError || !profile) {
      console.log("❌ No se encontró el perfil del usuario");
      return {
        hasWinterSkin: false,
        userId: null,
        winterSkins: [],
        userItems: [],
        error: profileError?.message || "Profile not found"
      };
    }

    const userId = profile.id;
    console.log("✅ Usuario encontrado:", userId);

    // Buscar todas las skins de invierno en building_skins
    console.log("🔍 Buscando skins de invierno en building_skins...");
    const { data: winterSkins, error: skinsError } = await supabase
      .from("building_skins")
      .select("*")
      .or("name.ilike.%invierno%,name.ilike.%winter%,skin_key.ilike.%invierno%,skin_key.ilike.%winter%");

    if (skinsError) {
      console.error("❌ Error buscando skins de invierno:", skinsError);
    } else {
      console.log(`📦 Se encontraron ${winterSkins?.length || 0} skins de invierno en building_skins:`, winterSkins);
    }

    // Buscar items del usuario que sean skins de invierno
    console.log("🔍 Buscando items del usuario...");
    const { data: userItems, error: itemsError } = await supabase
      .from("user_items")
      .select("*")
      .eq("user_id", userId)
      .eq("item_type", "skin");

    if (itemsError) {
      console.error("❌ Error buscando items del usuario:", itemsError);
      return {
        hasWinterSkin: false,
        userId,
        winterSkins: winterSkins || [],
        userItems: [],
        error: itemsError.message
      };
    }

    console.log(`📦 El usuario tiene ${userItems?.length || 0} skins en su inventario`);

    // Filtrar skins de invierno del inventario del usuario
    const winterSkinKeys = winterSkins?.map(s => s.skin_key) || [];
    const userWinterSkins = userItems?.filter(item => 
      winterSkinKeys.includes(item.item_key) ||
      item.item_key.toLowerCase().includes('invierno') ||
      item.item_key.toLowerCase().includes('winter')
    ) || [];

    const hasWinterSkin = userWinterSkins.length > 0;

    console.log("\n" + "=".repeat(50));
    console.log("📊 RESULTADO:");
    console.log("=".repeat(50));
    console.log(`Usuario ID: ${userId}`);
    console.log(`¿Tiene skin de invierno?: ${hasWinterSkin ? '✅ SÍ' : '❌ NO'}`);
    console.log(`\nSkins de invierno disponibles en la BD: ${winterSkins?.length || 0}`);
    if (winterSkins && winterSkins.length > 0) {
      winterSkins.forEach(skin => {
        console.log(`  - ${skin.skin_key} (${skin.name}) - ${skin.building_type}`);
      });
    }
    console.log(`\nSkins de invierno del usuario: ${userWinterSkins.length}`);
    if (userWinterSkins.length > 0) {
      userWinterSkins.forEach(item => {
        console.log(`  - ${item.item_key} (cantidad: ${item.quantity})`);
      });
    }
    console.log(`\nTotal de skins del usuario: ${userItems?.length || 0}`);
    if (userItems && userItems.length > 0) {
      console.log("Todas las skins del usuario:");
      userItems.forEach(item => {
        console.log(`  - ${item.item_key} (cantidad: ${item.quantity})`);
      });
    }
    console.log("=".repeat(50));

    return {
      hasWinterSkin,
      userId,
      winterSkins: winterSkins || [],
      userItems: userItems || [],
      userWinterSkins
    };
  } catch (error: any) {
    console.error("❌ Error al verificar skin de invierno:", error);
    return {
      hasWinterSkin: false,
      userId: null,
      winterSkins: [],
      userItems: [],
      error: error.message
    };
  }
};

