import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Play, RotateCcw, Trophy, Zap, Medal } from "lucide-react";
import chickenIcon from "@/assets/game/icon.png";
import { supabase } from "@/integrations/supabase/client";

interface FlappyChickenGameProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string | null;
}

interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

// Game constants
const GAME_WIDTH = 288;
const GAME_HEIGHT = 512;
const CHICKEN_SIZE = 24; // Reduced from 38 to make it more challenging like original
const CHICKEN_X = 60;

// Physics - more like original Flappy Bird curve
const GRAVITY = 0.35;
const JUMP_VELOCITY = -5.5;
const TERMINAL_VELOCITY = 8;

// Pipes
const PIPE_WIDTH = 52;
const PIPE_GAP = 125;
const PIPE_SPEED = 1.8;
const PIPE_SPAWN_DISTANCE = 200;

// Ground
const GROUND_HEIGHT = 100;
const GROUND_SPEED = 1.8; // Match pipe speed

const FlappyChickenGame = ({ open, onOpenChange, userId }: FlappyChickenGameProps) => {
  const [displayState, setDisplayState] = useState<"ready" | "playing" | "gameover">("ready");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [boostEarned, setBoostEarned] = useState<number | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  // Game state refs
  const chickenYRef = useRef((GAME_HEIGHT - GROUND_HEIGHT) / 2 - CHICKEN_SIZE / 2);
  const chickenVelocityRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const groundOffsetRef = useRef(0);
  const isPlayingRef = useRef(false);
  const lastInteractionTimeRef = useRef(0);

  const gameLoopRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chickenImgRef = useRef<HTMLImageElement | null>(null);

  // Load high score and image
  useEffect(() => {
    const saved = localStorage.getItem("flappy_chicken_highscore");
    if (saved) setHighScore(parseInt(saved));

    // Detect touch device
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);

    // Preload chicken image
    const img = new Image();
    img.src = chickenIcon;
    img.onload = () => {
      chickenImgRef.current = img;
      setImageLoaded(true);
    };
  }, []);

  // Calculate scale to fit 90% of screen
  useEffect(() => {
    const calculateScale = () => {
      const maxWidth = window.innerWidth * 0.9;
      const maxHeight = window.innerHeight * 0.85; // Leave room for UI
      const scaleX = maxWidth / GAME_WIDTH;
      const scaleY = maxHeight / GAME_HEIGHT;
      const newScale = Math.min(scaleX, scaleY, 2); // Cap at 2x
      setScale(newScale);
    };
    
    calculateScale();
    window.addEventListener("resize", calculateScale);
    return () => window.removeEventListener("resize", calculateScale);
  }, []);

  // Calculate boost based on score
  const calculateBoost = (finalScore: number): number => {
    const boost = Math.min(0.13, finalScore * 0.001);
    return Math.round(boost * 1000) / 1000;
  };

  // Save boost to database
  const saveBoost = useCallback(async (finalScore: number) => {
    if (!userId || finalScore < 10) return;
    
    const boostValue = calculateBoost(finalScore);
    const durationMinutes = 60;
    
    try {
      const { error } = await supabase.rpc("add_minigame_boost", {
        p_user_id: userId,
        p_boost_value: boostValue,
        p_duration_minutes: durationMinutes
      });
      
      if (!error) {
        setBoostEarned(boostValue);
      }
    } catch (e) {
      console.error("[FlappyChicken] Error saving boost:", e);
    }
  }, [userId]);

  // Game over handler
  const handleGameOver = useCallback((finalScore: number) => {
    isPlayingRef.current = false;
    
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    
    setScore(finalScore);
    setDisplayState("gameover");
    
    const newHighScore = finalScore > highScore;
    setIsNewHighScore(newHighScore);
    
    if (newHighScore) {
      setHighScore(finalScore);
      localStorage.setItem("flappy_chicken_highscore", finalScore.toString());
    }
    
    saveBoost(finalScore);
  }, [highScore, saveBoost]);

  // Draw the game
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    
    // Clear and draw sky
    ctx.fillStyle = "#4EC0CA";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Draw pipes
    pipesRef.current.forEach(pipe => {
      const pipeCapHeight = 24;
      const pipeCapOverhang = 3;
      
      // Top pipe
      ctx.fillStyle = "#73BF2E";
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY - pipeCapHeight);
      ctx.fillRect(pipe.x - pipeCapOverhang, pipe.gapY - pipeCapHeight, PIPE_WIDTH + pipeCapOverhang * 2, pipeCapHeight);
      
      ctx.strokeStyle = "#558B2F";
      ctx.lineWidth = 2;
      ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY - pipeCapHeight);
      ctx.strokeRect(pipe.x - pipeCapOverhang, pipe.gapY - pipeCapHeight, PIPE_WIDTH + pipeCapOverhang * 2, pipeCapHeight);
      
      // Bottom pipe
      const bottomPipeTop = pipe.gapY + PIPE_GAP;
      const bottomPipeHeight = GAME_HEIGHT - GROUND_HEIGHT - bottomPipeTop;
      
      ctx.fillStyle = "#73BF2E";
      ctx.fillRect(pipe.x, bottomPipeTop + pipeCapHeight, PIPE_WIDTH, bottomPipeHeight - pipeCapHeight);
      ctx.fillRect(pipe.x - pipeCapOverhang, bottomPipeTop, PIPE_WIDTH + pipeCapOverhang * 2, pipeCapHeight);
      
      ctx.strokeRect(pipe.x, bottomPipeTop + pipeCapHeight, PIPE_WIDTH, bottomPipeHeight - pipeCapHeight);
      ctx.strokeRect(pipe.x - pipeCapOverhang, bottomPipeTop, PIPE_WIDTH + pipeCapOverhang * 2, pipeCapHeight);
    });
    
    // Draw ground
    const groundY = GAME_HEIGHT - GROUND_HEIGHT;
    
    ctx.fillStyle = "#DED895";
    ctx.fillRect(0, groundY, GAME_WIDTH, GROUND_HEIGHT);
    
    // Grass
    ctx.fillStyle = "#54B435";
    ctx.fillRect(0, groundY, GAME_WIDTH, 12);
    ctx.fillStyle = "#3D8B27";
    ctx.fillRect(0, groundY + 12, GAME_WIDTH, 3);
    
    // Subtle scrolling stripes (only when playing)
    if (isPlayingRef.current) {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#C4A35A";
      const stripeWidth = 40;
      const stripeGap = 40;
      
      for (let row = 0; row < 3; row++) {
        const rowY = groundY + 22 + row * 25;
        const offset = groundOffsetRef.current % (stripeWidth + stripeGap);
        
        for (let x = -offset - stripeWidth + (row % 2) * 20; x < GAME_WIDTH + stripeWidth; x += stripeWidth + stripeGap) {
          ctx.fillRect(x, rowY, stripeWidth, 3);
        }
      }
      ctx.globalAlpha = 1.0;
    } else {
      // Static stripes when not playing
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#C4A35A";
      for (let row = 0; row < 3; row++) {
        const rowY = groundY + 22 + row * 25;
        for (let x = (row % 2) * 20; x < GAME_WIDTH; x += 80) {
          ctx.fillRect(x, rowY, 40, 3);
        }
      }
      ctx.globalAlpha = 1.0;
    }
    
    // Draw chicken
    const chickenY = chickenYRef.current;
    if (chickenImgRef.current) {
      ctx.save();
      ctx.translate(CHICKEN_X + CHICKEN_SIZE / 2, chickenY + CHICKEN_SIZE / 2);
      
      // Rotation based on velocity - more subtle like original Flappy Bird
      let rotation = chickenVelocityRef.current * 3;
      rotation = Math.max(-30, Math.min(90, rotation));
      ctx.rotate((rotation * Math.PI) / 180);
      
      ctx.scale(-1, 1);
      ctx.drawImage(
        chickenImgRef.current,
        -CHICKEN_SIZE / 2,
        -CHICKEN_SIZE / 2,
        CHICKEN_SIZE,
        CHICKEN_SIZE
      );
      ctx.restore();
    }
    
    // Draw score
    if (isPlayingRef.current) {
      ctx.fillStyle = "white";
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 3;
      ctx.font = "bold 36px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const scoreText = scoreRef.current.toString();
      ctx.strokeText(scoreText, GAME_WIDTH / 2, 20);
      ctx.fillText(scoreText, GAME_WIDTH / 2, 20);
    }
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!isPlayingRef.current) return;
    
    // Update chicken physics
    chickenVelocityRef.current += GRAVITY;
    chickenVelocityRef.current = Math.min(chickenVelocityRef.current, TERMINAL_VELOCITY);
    chickenYRef.current += chickenVelocityRef.current;
    
    // Update ground scroll
    groundOffsetRef.current += GROUND_SPEED;
    
    // Check ceiling
    if (chickenYRef.current < 0) {
      chickenYRef.current = 0;
      chickenVelocityRef.current = 0;
    }
    
    // Check ground collision
    if (chickenYRef.current + CHICKEN_SIZE > GAME_HEIGHT - GROUND_HEIGHT) {
      chickenYRef.current = GAME_HEIGHT - GROUND_HEIGHT - CHICKEN_SIZE;
      handleGameOver(scoreRef.current);
      draw();
      return;
    }
    
    // Spawn pipes
    if (pipesRef.current.length === 0 || pipesRef.current[pipesRef.current.length - 1].x < GAME_WIDTH - PIPE_SPAWN_DISTANCE) {
      const minGapY = 100; // Increased from 80 to make gaps appear higher, more challenging
      const maxGapY = GAME_HEIGHT - GROUND_HEIGHT - PIPE_GAP - 100;
      const gapY = Math.random() * (maxGapY - minGapY) + minGapY;
      pipesRef.current.push({ x: GAME_WIDTH, gapY, passed: false });
    }

    // Update pipes and check collisions
    const hitboxPadding = 2; // Reduced from 4 to make hitbox less forgiving
    const chickenLeft = CHICKEN_X + hitboxPadding;
    const chickenRight = CHICKEN_X + CHICKEN_SIZE - hitboxPadding;
    const chickenTop = chickenYRef.current + hitboxPadding;
    const chickenBottom = chickenYRef.current + CHICKEN_SIZE - hitboxPadding;
    
    for (let i = pipesRef.current.length - 1; i >= 0; i--) {
      const pipe = pipesRef.current[i];
      pipe.x -= PIPE_SPEED;
      
      // Remove off-screen pipes
      if (pipe.x < -PIPE_WIDTH) {
        pipesRef.current.splice(i, 1);
        continue;
      }
      
      // Collision check
      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + PIPE_WIDTH;
      const topPipeBottom = pipe.gapY;
      const bottomPipeTop = pipe.gapY + PIPE_GAP;
      
      if (chickenRight > pipeLeft && chickenLeft < pipeRight) {
        if (chickenTop < topPipeBottom || chickenBottom > bottomPipeTop) {
          handleGameOver(scoreRef.current);
          draw();
          return;
        }
      }
      
      // Score when passing pipe
      if (!pipe.passed && CHICKEN_X > pipe.x + PIPE_WIDTH) {
        pipe.passed = true;
        scoreRef.current++;
        setScore(scoreRef.current);
      }
    }
    
    draw();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [draw, handleGameOver]);

  // Go to ready state
  const goToReady = useCallback(() => {
    chickenYRef.current = (GAME_HEIGHT - GROUND_HEIGHT) / 2 - CHICKEN_SIZE / 2;
    chickenVelocityRef.current = 0;
    pipesRef.current = [];
    scoreRef.current = 0;
    groundOffsetRef.current = 0;
    isPlayingRef.current = false;
    lastInteractionTimeRef.current = 0;

    setScore(0);
    setBoostEarned(null);
    setIsNewHighScore(false);
    setDisplayState("ready");
  }, []);

  // Start game
  const startGame = useCallback(() => {
    chickenYRef.current = (GAME_HEIGHT - GROUND_HEIGHT) / 2 - CHICKEN_SIZE / 2;
    chickenVelocityRef.current = JUMP_VELOCITY; // Initial jump
    pipesRef.current = [];
    scoreRef.current = 0;
    groundOffsetRef.current = 0;
    isPlayingRef.current = true;
    lastInteractionTimeRef.current = 0;

    setScore(0);
    setBoostEarned(null);
    setIsNewHighScore(false);
    setDisplayState("playing");

    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  // Jump
  const jump = useCallback(() => {
    if (isPlayingRef.current) {
      chickenVelocityRef.current = JUMP_VELOCITY;
    }
  }, []);

  // Handle interaction
  const handleInteraction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    const timeSinceLastInteraction = now - lastInteractionTimeRef.current;

    // Prevent double jumps - minimum 100ms between interactions
    if (timeSinceLastInteraction < 100) {
      return;
    }

    lastInteractionTimeRef.current = now;

    if (displayState === "playing") {
      jump();
    } else if (displayState === "ready") {
      startGame();
    }
  }, [displayState, jump, startGame]);

  // Keyboard controls
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        if (displayState === "playing") {
          jump();
        } else if (displayState === "ready") {
          startGame();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, displayState, jump, startGame]);

  // Clean up on close
  useEffect(() => {
    if (!open) {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      isPlayingRef.current = false;
      setDisplayState("ready");
    }
  }, [open]);

  // Ready screen animation
  useEffect(() => {
    if (!open || !imageLoaded || displayState !== "ready") return;
    
    let animationId: number;
    const animate = () => {
      // Bob animation
      const bobOffset = Math.sin(Date.now() / 250) * 4;
      chickenYRef.current = (GAME_HEIGHT - GROUND_HEIGHT) / 2 - CHICKEN_SIZE / 2 + bobOffset;
      draw();
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [open, imageLoaded, displayState, draw]);

  const scaledWidth = Math.round(GAME_WIDTH * scale);
  const scaledHeight = Math.round(GAME_HEIGHT * scale);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="p-0 bg-transparent border-none shadow-none [&>button]:hidden"
        style={{ maxWidth: scaledWidth + 16 }}
      >
        <div 
          className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-900"
          style={{ width: scaledWidth, height: scaledHeight }}
        >
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-2 right-2 z-50 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Game canvas */}
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            className="cursor-pointer block"
            onClick={isTouchDevice ? undefined : handleInteraction}
            onTouchStart={handleInteraction}
            style={{ width: scaledWidth, height: scaledHeight }}
          />
          
          {/* Ready overlay - TAP to start */}
          {displayState === "ready" && (
            <div 
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
              onClick={(e) => { e.stopPropagation(); startGame(); }}
            >
              {/* Title at top */}
              <div className="absolute top-8 left-0 right-0 text-center">
                <h2 className="text-3xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  Flappy Chicken
                </h2>
                {highScore > 0 && (
                  <div className="flex items-center justify-center gap-2 mt-2 text-yellow-300">
                    <Trophy className="w-5 h-5" />
                    <span className="font-bold text-lg drop-shadow-md">Récord: {highScore}</span>
                  </div>
                )}
              </div>
              
              {/* TAP instruction - pulsing */}
              <div className="bg-white/90 rounded-2xl px-8 py-4 shadow-xl animate-pulse">
                <p className="text-3xl font-bold text-amber-800 text-center">
                  TAP
                </p>
                <p className="text-amber-600 text-sm text-center mt-1">
                  para empezar
                </p>
              </div>
              
              {/* Hint at bottom */}
              <p className="absolute bottom-16 text-white/70 text-xs text-center">
                10+ puntos = boost de fee
              </p>
            </div>
          )}
          
          {/* Game over overlay */}
          {displayState === "gameover" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
              <div className="bg-amber-100 border-4 border-amber-800 rounded-xl px-6 py-4 shadow-lg min-w-[200px]">
                <h2 className="text-xl font-bold text-amber-900 mb-3 text-center">
                  Game Over
                </h2>
                
                <div className="bg-amber-200 rounded-lg p-3 mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-amber-800">Puntos</span>
                    <span className="text-2xl font-bold text-amber-900">{score}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <Medal className="w-4 h-4 text-yellow-600" />
                      <span className="text-amber-800">Mejor</span>
                    </div>
                    <span className="text-xl font-bold text-amber-900">{highScore}</span>
                  </div>
                </div>
                
                {isNewHighScore && (
                  <div className="bg-yellow-400 text-yellow-900 rounded-lg px-3 py-1 mb-3 text-center font-bold animate-pulse">
                    🎉 ¡NUEVO RÉCORD! 🎉
                  </div>
                )}
                
                {boostEarned !== null && boostEarned > 0 && (
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-2 mb-3 text-white text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Zap className="w-4 h-4" />
                      <span className="font-bold text-sm">¡Boost!</span>
                    </div>
                    <p className="text-sm font-bold">-{(boostEarned * 100).toFixed(1)}% fee (1h)</p>
                  </div>
                )}
                
                {score < 10 && (
                  <p className="text-amber-700 text-xs mb-3 text-center">
                    10+ puntos = boost de fee
                  </p>
                )}
                
                <div className="flex gap-2">
                  <Button
                    onClick={(e) => { e.stopPropagation(); goToReady(); }}
                    className="flex-1 bg-green-500 hover:bg-green-400 text-white font-bold gap-1 border-2 border-green-700"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Otra vez
                  </Button>
                  <Button
                    onClick={(e) => { e.stopPropagation(); onOpenChange(false); }}
                    variant="outline"
                    className="bg-amber-200 hover:bg-amber-300 text-amber-900 border-2 border-amber-700"
                  >
                    Salir
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlappyChickenGame;
