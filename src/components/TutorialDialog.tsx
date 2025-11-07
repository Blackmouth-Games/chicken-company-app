import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tutorialSteps = [
  {
    title: "Compra Edificios",
    description: "Compra corrales, mercados y almacenes para comenzar tu granja. Cada edificio tiene diferentes capacidades y costos.",
  },
  {
    title: "Produce Huevos",
    description: "Los corrales producen huevos automáticamente. A mayor nivel, mayor producción y capacidad de almacenamiento.",
  },
  {
    title: "Vende en el Mercado",
    description: "Usa el mercado para vender tus huevos y generar ingresos. Mejora el mercado para aumentar las ventas.",
  },
  {
    title: "Almacena Productos",
    description: "Los almacenes te permiten guardar más huevos. Aumenta tu capacidad mejorando los almacenes.",
  },
];

export const TutorialDialog = ({ open, onOpenChange }: TutorialDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[90vh] flex flex-col p-0" hideCloseButton>
        <DialogHeader className="border-b p-4 flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-xl">Tutorial</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {tutorialSteps.map((step, index) => (
            <div key={index} className="flex gap-4">
              <div className="w-20 h-20 bg-muted rounded flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-muted-foreground">img png</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-4 flex justify-center">
          <Button
            onClick={() => onOpenChange(false)}
            className="min-w-[100px]"
          >
            Ok
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
