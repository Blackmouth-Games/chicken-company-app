import { Copy, RotateCw, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface SelectionToolbarProps {
  selectedObject: { type: 'building' | 'belt'; id: string } | null;
  onRotate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDeselect: () => void;
}

export const SelectionToolbar = ({ 
  selectedObject, 
  onRotate, 
  onDuplicate, 
  onDelete,
  onDeselect 
}: SelectionToolbarProps) => {
  const { t } = useLanguage();
  
  // Don't show toolbar if nothing is selected
  if (!selectedObject) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-background/95 backdrop-blur-sm border-2 border-primary rounded-lg shadow-2xl p-3 flex gap-2 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded text-sm font-medium text-primary">
        {selectedObject.type === 'belt' ? '🔧' : '🏗️'} {selectedObject.id}
      </div>
      
      <div className="h-6 w-px bg-border" />
      
      <Button
        onClick={onRotate}
        size="sm"
        variant="outline"
        className="gap-2"
        title={t('layoutEditor.rotate')}
      >
        <RotateCw className="h-4 w-4" />
        {t('layoutEditor.rotate')}
      </Button>
      
      <Button
        onClick={onDuplicate}
        size="sm"
        variant="outline"
        className="gap-2"
        title={t('layoutEditor.duplicate')}
      >
        <Copy className="h-4 w-4" />
        {t('layoutEditor.duplicate')}
      </Button>
      
      {selectedObject.type === 'belt' && (
        <Button
          onClick={onDelete}
          size="sm"
          variant="destructive"
          className="gap-2"
          title={t('layoutEditor.delete')}
        >
          <Trash2 className="h-4 w-4" />
          {t('common.delete')}
        </Button>
      )}
      
      <div className="h-6 w-px bg-border" />
      
      <Button
        onClick={onDeselect}
        size="sm"
        variant="ghost"
        title={t('common.close')}
      >
        ✕
      </Button>
    </div>
  );
};
