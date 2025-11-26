import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useState, useMemo } from "react";
import { useUserBuildings } from "@/hooks/useUserBuildings";
import { SkinSelectorDialog } from "./SkinSelectorDialog";
import { getBuildingDisplay } from "@/lib/buildingImages";
import { useBuildingSkins } from "@/hooks/useBuildingSkins";
import { BUILDING_TYPES } from "@/lib/constants";
import { Edit } from "lucide-react";

interface HouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
}

export const HouseDialog = ({ open, onOpenChange, userId }: HouseDialogProps) => {
  const { refetch } = useUserBuildings(userId);
  const [showSkinSelector, setShowSkinSelector] = useState(false);
  
  // House skins
  const { getSkinByKey } = useBuildingSkins(BUILDING_TYPES.HOUSE);

  // House display
  const houseDisplay = useMemo(() => {
    return getBuildingDisplay('house', 1, null, undefined);
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent hideCloseButton className="w-full max-h-[85vh] md:w-[92vw] md:max-w-2xl p-0 sm:rounded-lg bg-gradient-to-b from-amber-50 to-orange-50 border-2 border-amber-300 flex flex-col">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-amber-200 bg-amber-100/50 flex-shrink-0">
              <h2 className="text-2xl font-bold text-amber-900">🏠 Masía del Granjero</h2>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="hover:bg-amber-200/50">
                ✕
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="max-w-2xl mx-auto p-6 space-y-6">
                {/* House Card with Edit Button */}
                <div className="relative border-2 border-amber-300 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 p-6">
                  <button
                    onClick={() => setShowSkinSelector(true)}
                    className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-md hover:bg-white transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  
                  <div className="flex flex-col items-center gap-3">
                    {houseDisplay?.type === 'image' ? (
                      <img 
                        src={houseDisplay.src} 
                        alt="Casa" 
                        className="w-52 h-52 object-contain"
                      />
                    ) : (
                      <div className="text-9xl">🏠</div>
                    )}
                    <div className="text-center">
                      <h3 className="font-bold text-amber-900 text-lg">Casa del Granjero</h3>
                    </div>
                  </div>
                </div>

                {/* Coming Soon Message - as a block */}
                <div className="border-2 border-amber-300 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 p-6">
                  <div className="text-center">
                    <h3 className="text-3xl font-bold text-amber-900">Coming Soon</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Skin Selector Dialog */}
      <SkinSelectorDialog
        open={showSkinSelector}
        onOpenChange={setShowSkinSelector}
        buildingId={undefined} // House doesn't have a building ID in database
        buildingType={BUILDING_TYPES.HOUSE}
        userId={userId}
        currentSkin={null}
        onSkinSelected={() => {
          refetch();
          setShowSkinSelector(false);
        }}
      />
    </>
  );
};
