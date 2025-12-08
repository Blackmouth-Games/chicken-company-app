import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Play, RotateCcw, Trophy, Zap, Medal, BarChart3 } from "lucide-react";
import chickenL0 from "@/assets/game/chicken/L0.png";
import chickenL1 from "@/assets/game/chicken/L1.png";
import chickenL2 from "@/assets/game/chicken/L2.png";
import chickenL3 from "@/assets/game/chicken/L3.png";
import chickenL4 from "@/assets/game/chicken/L4.png";
import chickenL5 from "@/assets/game/chicken/L5.png";
import chickenL7 from "@/assets/game/chicken/L7.png";
import chickenL8 from "@/assets/game/chicken/L8.png";
import chickenL9 from "@/assets/game/chicken/L9.png";
import chickenL10 from "@/assets/game/chicken/L10.png";
import chickenL11 from "@/assets/game/chicken/L11.png";
import chickenL12 from "@/assets/game/chicken/L12.png";
import chickenL13 from "@/assets/game/chicken/L13.png";
import chickenL14 from "@/assets/game/chicken/L14.png";
import barTopImg from "@/assets/game/bar_top.png";
import barBottomImg from "@/assets/game/bar_bottom.png";
import { supabase } from "@/integrations/supabase/client";

// Array de imágenes de niveles de la gallina (L0 es el nivel inicial)
// Nota: L6 no existe, se salta de L5 a L7
const CHICKEN_LEVEL_IMAGES = [
  chickenL0, chickenL1, chickenL2, chickenL3, chickenL4, chickenL5,
  chickenL7, chickenL8, chickenL9, chickenL10, chickenL11, chickenL12,
  chickenL13, chickenL14
];
const LEVELS_PER_SCORE = 10; // Cada 10 puntos sube un nivel

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
const CHICKEN_SIZE = 35; // 35% smaller than previous 54px
const CHICKEN_X = 60;

// Physics - more like original Flappy Bird curve
const GRAVITY = 0.35;
const JUMP_VELOCITY = -5.5;
const TERMINAL_VELOCITY = 8;

// Pipes
const PIPE_WIDTH = 52;
const PIPE_GAP = 125;
const INITIAL_PIPE_SPEED = 1.8;
const PIPE_SPAWN_DISTANCE = 200;
const SPEED_INCREASE_INTERVAL = 5; // Increase speed every 5 pipes
const SPEED_INCREASE_AMOUNT = 0.2; // How much to increase speed by

// Ground
const GROUND_HEIGHT = 100;
const INITIAL_GROUND_SPEED = 1.8; // Match pipe speed

const FlappyChickenGame = ({ open, onOpenChange, userId }: FlappyChickenGameProps) => {
  const [displayState, setDisplayState] = useState<"ready" | "playing" | "gameover">("ready");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [boostEarned, setBoostEarned] = useState<number | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Game metrics
  interface GameMetrics {
    totalAttempts: number;
    totalDeaths: number;
    totalPlayTime: number; // in seconds
    averageScore: number;
    maxLevelReached: number;
    scores: number[]; // Array of all scores for average calculation
  }
  
  const [metrics, setMetrics] = useState<GameMetrics>({
    totalAttempts: 0,
    totalDeaths: 0,
    totalPlayTime: 0,
    averageScore: 0,
    maxLevelReached: 0,
    scores: []
  });
  
  const gameStartTimeRef = useRef<number | null>(null);
  
  // Game state refs
  const chickenYRef = useRef((GAME_HEIGHT - GROUND_HEIGHT) / 2 - CHICKEN_SIZE / 2);
  const chickenVelocityRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const groundOffsetRef = useRef(0);
  const isPlayingRef = useRef(false);
  const lastInteractionTimeRef = useRef(0);
  const pipeSpeedRef = useRef(INITIAL_PIPE_SPEED);
  const groundSpeedRef = useRef(INITIAL_GROUND_SPEED);

  const gameLoopRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chickenImgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const barTopImgRef = useRef<HTMLImageElement | null>(null);
  const barBottomImgRef = useRef<HTMLImageElement | null>(null);
  const lastChickenLevelRef = useRef<number>(-1);

  // Calculate chicken level based on score (every 10 points = +1 level, cycles)
  const getChickenLevel = useCallback((currentScore: number): number => {
    const level = Math.floor(currentScore / LEVELS_PER_SCORE);
    // Cycle through available levels (if 2 images, level 2 becomes level 0 again)
    return level % CHICKEN_LEVEL_IMAGES.length;
  }, []);

  // Load metrics from database
  const loadMetrics = useCallback(async (): Promise<GameMetrics | null> => {
    if (!userId) return null;
    
    try {
      const { data, error } = await supabase
        .from("flappy_chicken_metrics" as any)
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error("Error loading metrics:", error);
        return null;
      }
      
      if (data) {
        const metricsData = data as any;
        return {
          totalAttempts: metricsData.total_attempts || 0,
          totalDeaths: metricsData.total_deaths || 0,
          totalPlayTime: metricsData.total_play_time_seconds || 0,
          averageScore: Number(metricsData.average_score) || 0,
          maxLevelReached: metricsData.max_level_reached || 0,
          scores: metricsData.recent_scores || []
        };
      }
    } catch (e) {
      console.error("Error loading metrics:", e);
    }
    
    return null;
  }, [userId]);

  // Save metrics to database using upsert function
  const saveMetricsToDB = useCallback(async (
    score: number,
    playTimeSeconds: number,
    levelReached: number
  ) => {
    if (!userId) return Promise.resolve();
    
    try {
      const { data, error } = await supabase.rpc("upsert_flappy_chicken_metrics" as any, {
        p_user_id: userId,
        p_score: score,
        p_play_time_seconds: playTimeSeconds,
        p_level_reached: levelReached
      });
      
      if (error) {
        console.error("[FlappyChicken] Error saving metrics to database:", error);
        throw error;
      }
      
      return Promise.resolve();
    } catch (e) {
      console.error("[FlappyChicken] Error saving metrics:", e);
      return Promise.reject(e);
    }
  }, [userId]);

  // Check if user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!userId) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();

        if (error) {
          console.error("Error checking admin role:", error);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(!!data);
      } catch (error) {
        console.error("Error checking admin role:", error);
        setIsAdmin(false);
      }
    };

    checkAdminRole();
  }, [userId]);

  // Load high score, metrics and images
  useEffect(() => {
    // Load high score from database
    const loadHighScore = async () => {
      if (!userId) {
        // Fallback to localStorage if no user
        const saved = localStorage.getItem("flappy_chicken_highscore");
        if (saved) setHighScore(parseInt(saved));
        return;
      }

      try {
        const { data, error } = await supabase
          .from("flappy_chicken_metrics" as any)
          .select("high_score")
          .eq("user_id", userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error loading high score:", error);
          // Fallback to localStorage
          const saved = localStorage.getItem("flappy_chicken_highscore");
          if (saved) setHighScore(parseInt(saved));
          return;
        }

        if (data) {
          const dbHighScore = (data as any).high_score || 0;
          setHighScore(dbHighScore);
          // Also update localStorage as backup
          localStorage.setItem("flappy_chicken_highscore", dbHighScore.toString());
        } else {
          // No record yet, check localStorage
          const saved = localStorage.getItem("flappy_chicken_highscore");
          if (saved) setHighScore(parseInt(saved));
        }
      } catch (e) {
        console.error("Error loading high score:", e);
        // Fallback to localStorage
        const saved = localStorage.getItem("flappy_chicken_highscore");
        if (saved) setHighScore(parseInt(saved));
      }
    };

    loadHighScore();

    // Load metrics from database (for admin display)
    const loadMetricsData = async () => {
      if (isAdmin) {
        const loadedMetrics = await loadMetrics();
        if (loadedMetrics) {
          setMetrics(loadedMetrics);
        }
      }
    };
    loadMetricsData();

    // Detect touch device
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);

    // Preload all chicken level images - ensure all are loaded before allowing level changes
    let loadedCount = 0;
    let errorCount = 0;
    const totalImages = CHICKEN_LEVEL_IMAGES.length;
    chickenImgRefs.current = new Array(totalImages).fill(null);
    
    CHICKEN_LEVEL_IMAGES.forEach((imgSrc, index) => {
      const img = new Image();
      img.src = imgSrc;
      img.onload = () => {
        chickenImgRefs.current[index] = img;
        loadedCount++;
        
        // Set imageLoaded when first image loads (for initial display)
        if (loadedCount === 1) {
          setImageLoaded(true);
        }
      };
      img.onerror = () => {
        errorCount++;
        // Use L0 as fallback for failed images
        if (index > 0 && chickenImgRefs.current[0]) {
          chickenImgRefs.current[index] = chickenImgRefs.current[0];
          loadedCount++;
        }
      };
    });

    // Preload bar images
    const topImg = new Image();
    topImg.src = barTopImg;
    topImg.onload = () => {
      barTopImgRef.current = topImg;
    };

    const bottomImg = new Image();
    bottomImg.src = barBottomImg;
    bottomImg.onload = () => {
      barBottomImgRef.current = bottomImg;
    };
  }, [userId, isAdmin, loadMetrics]);

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
      const { error } = await supabase.rpc("add_minigame_boost" as any, {
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
    
    // Save metrics to database for all users (only admin can view them)
    if (userId) {
      const playTime = gameStartTimeRef.current 
        ? Math.floor((Date.now() - gameStartTimeRef.current) / 1000)
        : 0;
      
      const levelReached = getChickenLevel(finalScore);
      
      // Save to database using upsert function (this will also update high_score if it's higher)
      saveMetricsToDB(finalScore, playTime, levelReached).then(() => {
        // Update local high score if it's a new record
        if (newHighScore) {
          setHighScore(finalScore);
          localStorage.setItem("flappy_chicken_highscore", finalScore.toString());
        }
      });
      
      // If admin, also update local state for display
      if (isAdmin) {
        loadMetrics().then(loadedMetrics => {
          if (loadedMetrics) {
            setMetrics(loadedMetrics);
          }
        });
      }
    } else {
      // No user, use localStorage only
      if (newHighScore) {
        setHighScore(finalScore);
        localStorage.setItem("flappy_chicken_highscore", finalScore.toString());
      }
    }
    gameStartTimeRef.current = null;
    
    saveBoost(finalScore);
  }, [highScore, saveBoost, saveMetricsToDB, loadMetrics, getChickenLevel, isAdmin, userId]);

  // Draw the game
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    
    // Clear and draw sky
    ctx.fillStyle = "#4EC0CA";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Draw pipes using images
    pipesRef.current.forEach(pipe => {
      const bottomPipeTop = pipe.gapY + PIPE_GAP;
      
      // Top pipe - draw from top down to gapY
      if (barTopImgRef.current) {
        const topPipeHeight = pipe.gapY;
        const img = barTopImgRef.current;
        const imgHeight = img.height;
        const imgWidth = img.width;
        
        // Draw the top pipe image, scaling to match PIPE_WIDTH
        // The image is longer than needed, so we draw it from the bottom of the image
        const scale = PIPE_WIDTH / imgWidth;
        const drawHeight = topPipeHeight / scale;
        
        // Calculate source Y to show bottom part of image (since image is longer)
        const sourceY = Math.max(0, imgHeight - drawHeight);
        const sourceHeight = Math.min(drawHeight, imgHeight - sourceY);
        const destHeight = sourceHeight * scale;
        
        ctx.drawImage(
          img,
          0, sourceY, imgWidth, sourceHeight, // source
          pipe.x, 0, PIPE_WIDTH, destHeight // destination
        );
      }
      
      // Bottom pipe - draw from bottomPipeTop to ground
      if (barBottomImgRef.current) {
        const bottomPipeHeight = GAME_HEIGHT - GROUND_HEIGHT - bottomPipeTop;
        const img = barBottomImgRef.current;
        const imgHeight = img.height;
        const imgWidth = img.width;
        
        // Draw the bottom pipe image, scaling to match PIPE_WIDTH
        // The image is longer than needed, so we draw it from the top of the image
        const scale = PIPE_WIDTH / imgWidth;
        const drawHeight = bottomPipeHeight / scale;
        
        // Calculate source Y to show top part of image (since image is longer)
        const sourceY = 0;
        const sourceHeight = Math.min(drawHeight, imgHeight);
        const destHeight = sourceHeight * scale;
        
        ctx.drawImage(
          img,
          0, sourceY, imgWidth, sourceHeight, // source
          pipe.x, bottomPipeTop, PIPE_WIDTH, destHeight // destination
        );
      }
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
    
    // Draw chicken with level-based image
    const chickenY = chickenYRef.current;
    // Reset level to 0 when in ready state (after death or restart)
    const scoreForLevel = displayState === "ready" ? 0 : scoreRef.current;
    const currentLevel = getChickenLevel(scoreForLevel);
    const currentChickenImg = chickenImgRefs.current[currentLevel];
    
    // Track level changes and log for debugging
    if (currentLevel !== lastChickenLevelRef.current && isPlayingRef.current) {
      console.log(`[FlappyChicken] Level changed in draw: ${lastChickenLevelRef.current} → ${currentLevel} (Score: ${scoreRef.current}, ScoreForLevel: ${scoreForLevel})`);
      console.log(`[FlappyChicken] Image for level ${currentLevel}:`, {
        exists: !!currentChickenImg,
        imageIndex: currentLevel,
        totalImages: CHICKEN_LEVEL_IMAGES.length,
        allImagesLoaded: chickenImgRefs.current.every(img => !!img)
      });
      lastChickenLevelRef.current = currentLevel;
    }
    
    // Fallback to L0 if image not loaded yet
    const imgToDraw = currentChickenImg || chickenImgRefs.current[0];
    const actualImageIndex = currentChickenImg ? currentLevel : 0;
    
    // Debug: Log what image is being drawn (only when level changes)
    if (currentLevel !== lastChickenLevelRef.current && isPlayingRef.current) {
      console.log(`[FlappyChicken] Drawing image: Level ${currentLevel}, Using index ${actualImageIndex}, Image object:`, imgToDraw);
      console.log(`[FlappyChicken] Image refs array:`, chickenImgRefs.current.map((img, idx) => ({ 
        index: idx, 
        loaded: !!img, 
        src: img?.src?.substring(img.src.lastIndexOf('/') + 1) || 'none' 
      })));
    }
    
    if (!currentChickenImg && currentLevel > 0 && isPlayingRef.current) {
      console.warn(`[FlappyChicken] Draw: Image for level ${currentLevel} not available, using L0 fallback`);
    }
    
    if (imgToDraw) {
      ctx.save();
      ctx.translate(CHICKEN_X + CHICKEN_SIZE / 2, chickenY + CHICKEN_SIZE / 2);
      
      // Rotation based on velocity - more subtle like original Flappy Bird
      let rotation = chickenVelocityRef.current * 3;
      rotation = Math.max(-30, Math.min(90, rotation));
      ctx.rotate((rotation * Math.PI) / 180);
      
      ctx.drawImage(
        imgToDraw,
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
  }, [getChickenLevel, displayState]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!isPlayingRef.current) return;
    
    // Update chicken physics
    chickenVelocityRef.current += GRAVITY;
    chickenVelocityRef.current = Math.min(chickenVelocityRef.current, TERMINAL_VELOCITY);
    chickenYRef.current += chickenVelocityRef.current;
    
    // Update ground scroll
    groundOffsetRef.current += groundSpeedRef.current;
    
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
      pipe.x -= pipeSpeedRef.current;

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

      // Score when passing pipe and increase speed every SPEED_INCREASE_INTERVAL pipes
      if (!pipe.passed && CHICKEN_X > pipe.x + PIPE_WIDTH) {
        pipe.passed = true;
        scoreRef.current++;
        setScore(scoreRef.current);

        // Debug: Log when reaching level milestones (every 10 points)
        if (scoreRef.current % LEVELS_PER_SCORE === 0) {
          const newLevel = getChickenLevel(scoreRef.current);
          const levelImage = chickenImgRefs.current[newLevel];
          console.log(`[FlappyChicken] Score reached ${scoreRef.current} - Level: ${newLevel}, Image loaded: ${!!levelImage}, Total images: ${CHICKEN_LEVEL_IMAGES.length}`);
          if (!levelImage) {
            console.warn(`[FlappyChicken] WARNING: Image for level ${newLevel} (L${newLevel}) is not loaded!`);
            console.log(`[FlappyChicken] Available images:`, chickenImgRefs.current.map((img, idx) => ({ index: idx, loaded: !!img })));
          }
        }

        // Increase speed every SPEED_INCREASE_INTERVAL points
        if (scoreRef.current % SPEED_INCREASE_INTERVAL === 0) {
          pipeSpeedRef.current += SPEED_INCREASE_AMOUNT;
          groundSpeedRef.current += SPEED_INCREASE_AMOUNT;
        }
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
    pipeSpeedRef.current = INITIAL_PIPE_SPEED;
    groundSpeedRef.current = INITIAL_GROUND_SPEED;
    lastChickenLevelRef.current = -1; // Reset level tracking

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
    pipeSpeedRef.current = INITIAL_PIPE_SPEED;
    groundSpeedRef.current = INITIAL_GROUND_SPEED;
    gameStartTimeRef.current = Date.now(); // Track game start time
    lastChickenLevelRef.current = -1; // Reset level tracking

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

  // Reload metrics when stats dialog opens (for admin)
  useEffect(() => {
    if (showStats && isAdmin && userId) {
      loadMetrics().then(loadedMetrics => {
        if (loadedMetrics) {
          setMetrics(loadedMetrics);
        }
      });
    }
  }, [showStats, isAdmin, userId, loadMetrics]);

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
                
                {isAdmin && (
                  <div className="flex gap-2 mb-2">
                    <Button
                      onClick={(e) => { e.stopPropagation(); setShowStats(true); }}
                      variant="outline"
                      className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-900 border-2 border-blue-700"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Estadísticas
                    </Button>
                  </div>
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

          {/* Stats Dialog - Only for admins */}
          {isAdmin && (
            <Dialog open={showStats} onOpenChange={setShowStats}>
              <DialogContent className="max-w-md">
                <h2 className="text-2xl font-bold text-amber-900 mb-4">
                  Estadísticas del Juego
                </h2>
                
                <div className="space-y-3">
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-800 font-medium">Intentos totales:</span>
                      <span className="text-amber-900 font-bold text-lg">{metrics.totalAttempts}</span>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-800 font-medium">Muertes totales:</span>
                      <span className="text-amber-900 font-bold text-lg">{metrics.totalDeaths}</span>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-800 font-medium">Tiempo total jugado:</span>
                      <span className="text-amber-900 font-bold text-lg">
                        {Math.floor(metrics.totalPlayTime / 60)}m {metrics.totalPlayTime % 60}s
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-800 font-medium">Puntuación máxima:</span>
                      <span className="text-amber-900 font-bold text-lg">{highScore}</span>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-800 font-medium">Puntuación promedio:</span>
                      <span className="text-amber-900 font-bold text-lg">{metrics.averageScore}</span>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-800 font-medium">Nivel máximo alcanzado:</span>
                      <span className="text-amber-900 font-bold text-lg">
                        L{metrics.maxLevelReached}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={() => setShowStats(false)}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Cerrar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlappyChickenGame;
