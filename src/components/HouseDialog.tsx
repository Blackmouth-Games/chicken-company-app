import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useState, useMemo } from "react";
import { useUserBuildings } from "@/hooks/useUserBuildings";
import { SkinSelectorDialog } from "./SkinSelectorDialog";
import { getBuildingDisplay } from "@/lib/buildingImages";
import { useBuildingSkins } from "@/hooks/useBuildingSkins";
import { Edit } from "lucide-react";

interface HouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
}

export const HouseDialog = ({ open, onOpenChange, userId }: HouseDialogProps) => {
  const { refetch } = useUserBuildings(userId);
  const [showSkinSelector, setShowSkinSelector] = useState(false);
  
  // House skins - using 'house' as building type
  const { getSkinByKey } = useBuildingSkins('house' as any);

  // House display
  const houseDisplay = useMemo(() => {
    return getBuildingDisplay('house', 1, null, undefined);
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent hideCloseButton className="w-full h-full md:w-[92vw] md:h-auto md:max-w-2xl p-0 sm:rounded-lg bg-gradient-to-b from-amber-50 to-orange-50 border-2 border-amber-300">
          <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-amber-200 bg-amber-100/50">
              <h2 className="text-2xl font-bold text-amber-900">🏠 Masía del Granjero</h2>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="hover:bg-amber-200/50">
                ✕
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto p-6 space-y-6">
                {/* Coming Soon Message */}
                <div className="text-center">
                  <h3 className="text-3xl font-bold text-amber-900 mb-4">Coming Soon</h3>
                </div>

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
                      <div className="text-9xl">{houseDisplay?.emoji || '🏠'}</div>
                    )}
                    <div className="text-center">
                      <h3 className="font-bold text-amber-900 text-lg">Casa del Granjero</h3>
                    </div>
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
        buildingType={'house' as any}
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
