import { X } from "lucide-react";
import { Button } from "./ui/button";

interface ConveyorBeltProps {
  belt: {
    id: string;
    gridColumn: string;
    gridRow: string;
    direction: 'north' | 'south' | 'east' | 'west';
    type: 'straight' | 'curve-ne' | 'curve-nw' | 'curve-se' | 'curve-sw';
  };
  idx: number;
  isEditMode: boolean;
  isDragging: boolean;
  tempPosition: { col: number; row: number } | null;
  onMouseDown: (e: React.MouseEvent) => void;
  onRemove: () => void;
  onUpdateColumn: (value: string) => void;
  onUpdateRow: (value: string) => void;
}

export const ConveyorBelt = ({
  belt,
  idx,
  isEditMode,
  isDragging,
  tempPosition,
  onMouseDown,
  onRemove,
  onUpdateColumn,
  onUpdateRow,
}: ConveyorBeltProps) => {
  // Get arrow direction based on belt direction
  const getArrowTransform = () => {
    switch (belt.direction) {
      case 'north': return 'rotate(180deg)';
      case 'south': return 'rotate(0deg)';
      case 'east': return 'rotate(-90deg)';
      case 'west': return 'rotate(90deg)';
      default: return 'rotate(0deg)';
    }
  };

  // Get curve path for curved belts
  const getCurvePath = () => {
    switch (belt.type) {
      case 'curve-ne': return 'M 10 50 Q 10 10, 50 10 L 90 10';
      case 'curve-nw': return 'M 90 50 Q 90 10, 50 10 L 10 10';
      case 'curve-se': return 'M 10 50 Q 10 90, 50 90 L 90 90';
      case 'curve-sw': return 'M 90 50 Q 90 90, 50 90 L 10 90';
      default: return '';
    }
  };

  const isCurve = belt.type.startsWith('curve-');
  const isVertical = belt.direction === 'north' || belt.direction === 'south';

  return (
    <div 
      className={`flex justify-center relative group ${isEditMode ? 'ring-2 ring-cyan-500' : ''} ${
        isDragging ? 'ring-4 ring-cyan-600 ring-offset-4 opacity-50' : ''
      }`}
      style={{ 
        gridColumn: belt.gridColumn,
        gridRow: belt.gridRow
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={onMouseDown}
      data-belt={belt.id}
    >
      <div className={`w-full h-full relative overflow-hidden ${
        isEditMode ? 'cursor-move' : ''
      }`}>
        {/* Belt base with metallic look */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-600 via-slate-500 to-slate-600">
          {/* Side borders */}
          <div className="absolute inset-y-0 left-0 w-1 bg-slate-800"></div>
          <div className="absolute inset-y-0 right-0 w-1 bg-slate-800"></div>
          
          {isCurve ? (
            // Curved belt with SVG path
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id={`gradient-${belt.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <path 
                d={getCurvePath()} 
                stroke={`url(#gradient-${belt.id})`}
                strokeWidth="20" 
                fill="none"
                className="animate-pulse"
              />
              {/* Animated dots along curve */}
              {Array.from({ length: 5 }).map((_, i) => (
                <circle
                  key={i}
                  r="3"
                  fill="#38bdf8"
                  className="animate-[move_2s_linear_infinite]"
                  style={{
                    animationDelay: `${i * 0.4}s`,
                    offsetPath: `path('${getCurvePath()}')`,
                    offsetDistance: '0%',
                  }}
                >
                  <animateMotion
                    dur="2s"
                    repeatCount="indefinite"
                    begin={`${i * 0.4}s`}
                  >
                    <mpath href={`#curve-${belt.id}`} />
                  </animateMotion>
                </circle>
              ))}
            </svg>
          ) : (
            // Straight belt with arrows
            <>
              {/* Moving belt surface with chevrons */}
              <div className="absolute inset-0 flex flex-col items-center justify-evenly overflow-hidden">
                {Array.from({ length: isVertical ? 30 : 15 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="relative"
                    style={{
                      transform: getArrowTransform(),
                      animation: 'beltMove 2s linear infinite',
                      animationDelay: `${i * 0.066}s`,
                    }}
                  >
                    <svg width="24" height="12" viewBox="0 0 24 12" className="opacity-80">
                      <path 
                        d="M 12 0 L 24 6 L 12 12 L 0 6 Z" 
                        fill="#38bdf8"
                        className="drop-shadow-lg"
                      />
                    </svg>
                  </div>
                ))}
              </div>
              
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none" />
            </>
          )}
          
          {/* Gears/rollers effect at edges */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-slate-700 border-b-2 border-slate-800"></div>
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-700 border-t-2 border-slate-800"></div>
        </div>
        
        {isEditMode && (
          <>
            <div className="absolute top-2 right-2 bg-cyan-600 text-white text-xs px-2 py-1 rounded font-mono pointer-events-none z-10">
              {belt.direction.toUpperCase()} - {belt.type}
            </div>
            {tempPosition && isDragging && (
              <div className="absolute top-8 right-2 bg-yellow-500 text-black text-xs px-2 py-1 rounded font-bold pointer-events-none z-10">
                → Col {tempPosition.col}, Row {tempPosition.row}
              </div>
            )}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              size="sm"
              variant="destructive"
              className="absolute top-2 left-2 h-7 w-7 p-0 z-10"
              title="Eliminar cinta"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    
      {/* Edit Controls */}
      {isEditMode && (
        <div className="absolute -bottom-20 left-0 right-0 bg-background border-2 border-cyan-500 rounded-lg p-2 space-y-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 min-w-[200px]">
          <div className="flex gap-2 text-xs">
            <label className="flex-1">
              <span className="block text-muted-foreground">Column:</span>
              <input
                type="text"
                value={belt.gridColumn}
                onChange={(e) => onUpdateColumn(e.target.value)}
                className="w-full px-2 py-1 border rounded bg-background"
                placeholder="13 / 14"
                onClick={(e) => e.stopPropagation()}
              />
            </label>
            <label className="flex-1">
              <span className="block text-muted-foreground">Row:</span>
              <input
                type="text"
                value={belt.gridRow}
                onChange={(e) => onUpdateRow(e.target.value)}
                className="w-full px-2 py-1 border rounded bg-background"
                placeholder="1 / span 3"
                onClick={(e) => e.stopPropagation()}
              />
            </label>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes beltMove {
          0% {
            transform: ${getArrowTransform()} translateY(-10px);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: ${getArrowTransform()} translateY(10px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
