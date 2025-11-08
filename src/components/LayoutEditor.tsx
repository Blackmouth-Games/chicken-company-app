import { useState, useEffect } from "react";
import { Layout, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const LayoutEditor = () => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [position, setPosition] = useState(() => {
    const savedPosition = localStorage.getItem('layoutEditorPosition');
    return savedPosition ? JSON.parse(savedPosition) : { x: 16, y: 200 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const toggleEditMode = () => {
    const newMode = !isEditMode;
    setIsEditMode(newMode);
    window.dispatchEvent(new CustomEvent('layoutEditModeChange', { detail: newMode }));
    toast({
      title: newMode ? "Modo Edición Activado" : "Modo Edición Desactivado",
      description: newMode 
        ? "Edita las posiciones de edificios y cintas" 
        : "Cambios guardados automáticamente",
    });
  };

  const addBelt = () => {
    window.dispatchEvent(new CustomEvent('addBelt'));
  };

  const exportLayout = () => {
    const savedLayout = localStorage.getItem('debugLayoutConfig');
    if (savedLayout) {
      const blob = new Blob([savedLayout], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'layout-config.json';
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Layout exportado",
        description: "Configuración descargada correctamente",
      });
    }
  };

  // Drag handlers for button
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - 200, e.clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 56, e.clientY - dragOffset.y));
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      localStorage.setItem('layoutEditorPosition', JSON.stringify(position));
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <div
      className="fixed z-40 flex gap-2"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div
        className="cursor-move p-1 bg-background/80 rounded-lg border"
        onMouseDown={handleMouseDown}
      >
        <div className="flex gap-2">
          <Button
            onClick={toggleEditMode}
            size="sm"
            variant={isEditMode ? "default" : "outline"}
            className="gap-2"
          >
            <Layout className="h-4 w-4" />
            {isEditMode ? "Desactivar Edición" : "Activar Edición"}
          </Button>
          {isEditMode && (
            <Button
              onClick={addBelt}
              size="sm"
              variant="outline"
              className="gap-2"
              title="Agregar cinta transportadora"
            >
              <Plus className="h-4 w-4" />
              Agregar Cinta
            </Button>
          )}
          <Button
            onClick={exportLayout}
            size="sm"
            variant="outline"
            title="Exportar configuración"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LayoutEditor;
