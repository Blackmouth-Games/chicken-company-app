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
import barTopImg1 from "@/assets/game/bar_top_1.png";
import barBottomImg1 from "@/assets/game/bar_bottom_1.png";
import barTopImg2 from "@/assets/game/bar_top_2.png";
import barBottomImg2 from "@/assets/game/bar_bottom_2.png";
import barTopImg3 from "@/assets/game/bar_top_3.png";
import barBottomImg3 from "@/assets/game/bar_bottom_3.png";
import bg1 from "@/assets/game/bg/bg_1.jpg";
import bg2 from "@/assets/game/bg/bg_2.jpg";
import bg3 from "@/assets/game/bg/bg_3.jpg";
import bg4 from "@/assets/game/bg/bg_4.jpg";
import bg5 from "@/assets/game/bg/bg_5.jpg";
import bg6 from "@/assets/game/bg/bg_6.jpg";
import { supabase } from "@/integrations/supabase/client";

// Array de imágenes de niveles de la gallina (L0 es el nivel inicial)
// Nota: L6 no existe, se salta de L5 a L7
const CHICKEN_LEVEL_IMAGES = [
  chickenL0, chickenL1, chickenL2, chickenL3, chickenL4, chickenL5,
  chickenL7, chickenL8, chickenL9, chickenL10, chickenL11, chickenL12,
  chickenL13, chickenL14
];
const LEVELS_PER_SCORE = 10; // Cada 10 puntos sube un nivel
const BAR_LEVEL_INTERVAL = 30; // Cada 30 puntos cambia el nivel de barras (cambio inmediato)
const BG_LEVEL_INTERVAL = 30; // Cada 30 puntos cambia el fondo
const BG_FADE_DURATION = 2000; // Duración del fade en milisegundos (2 segundos)

// Array de imágenes de fondo (orden: bg_1, bg_2, bg_3, bg_4, bg_5, bg_6)
const BACKGROUND_IMAGES = [bg1, bg2, bg3, bg4, bg5, bg6];

interface FlappyChickenGameProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string | null;
}

interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
  barLevel: number; // 1, 2, 3, etc. - nivel de barras que usa este pipe
}

interface Particle {
  x: number;
  y: number;
  vx: number; // velocity x
  vy: number; // velocity y
  life: number; // 0 to 1, starts at 1, decreases over time
  size: number;
  color: string;
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
  // Arrays para almacenar imágenes de barras de diferentes niveles
  const barTopImgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const barBottomImgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const lastChickenLevelRef = useRef<number>(-1);
  const lastDebugLogTimeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const chickenUpgradeEffectStartRef = useRef<number | null>(null);
  const CHICKEN_UPGRADE_DURATION = 1500; // Duración del efecto de mejora en ms
  
  // Background system
  const bgImgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const currentBgLevelRef = useRef<number>(1);
  const bgTransitionStartTimeRef = useRef<number | null>(null);
  const previousBgLevelRef = useRef<number>(1);

  // Calculate chicken level based on score (every 10 points = +1 level, cycles)
  const getChickenLevel = useCallback((currentScore: number): number => {
    const level = Math.floor(currentScore / LEVELS_PER_SCORE);
    // Cycle through available levels (if 2 images, level 2 becomes level 0 again)
    return level % CHICKEN_LEVEL_IMAGES.length;
  }, []);

  // Determine bar level - changes immediately at level thresholds (30, 60, etc.)
  // Returns the bar level (1, 2, 3, etc.) that should be used for a pipe at the current score
  const getBarLevelForScore = useCallback((currentScore: number): number => {
    // Base level: every 30 points = +1 bar level
    // Level 1: scores 0-29
    // Level 2: scores 30-59
    // Level 3: scores 60-89
    // etc.
    return Math.floor(currentScore / BAR_LEVEL_INTERVAL) + 1;
  }, []);

  // Determine background level - changes at level thresholds (30, 60, etc.)
  // Returns the background level (1-5, cycles)
  const getBackgroundLevel = useCallback((currentScore: number): number => {
    const level = Math.floor(currentScore / BG_LEVEL_INTERVAL);
    // Cycle through available backgrounds (if 5 images, level 5 becomes level 0 again)
    return (level % BACKGROUND_IMAGES.length) + 1; // +1 because array is 0-indexed but levels are 1-indexed
  }, []);

  // Generate particles when level changes
  const createLevelUpParticles = useCallback((x: number, y: number) => {
    const MAX_PARTICLES = 50; // Limit total particles to prevent performance issues
    const particleCount = 15; // Reduced from 20 for better performance
    const colors = ["#FFD700", "#FFA500", "#FFFF00", "#FFFFFF", "#FF6B6B"];
    const newParticles: Particle[] = [];
    
    // Remove old particles if we're at the limit
    if (particlesRef.current.length + particleCount > MAX_PARTICLES) {
      particlesRef.current = particlesRef.current.slice(-(MAX_PARTICLES - particleCount));
    }
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 3;
      const size = 3 + Math.random() * 4;
      
      newParticles.push({
        x: x + CHICKEN_SIZE / 2,
        y: y + CHICKEN_SIZE / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        size: size,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    
    particlesRef.current.push(...newParticles);
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
      // Verify user exists in profiles table before saving
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      
      if (profileError || !profile) {
        // User doesn't exist in profiles, skip saving metrics
        return Promise.resolve();
      }
      
      const { data, error } = await supabase.rpc("upsert_flappy_chicken_metrics" as any, {
        p_user_id: userId,
        p_score: score,
        p_play_time_seconds: playTimeSeconds,
        p_level_reached: levelReached
      });
      
      if (error) {
        // Only log if it's not a foreign key constraint error (user not found)
        if (error.code !== '23503') {
          console.error("[FlappyChicken] Error saving metrics to database:", error);
        }
        return Promise.resolve(); // Don't throw, just fail silently
      }
      
      return Promise.resolve();
    } catch (e: any) {
      // Only log if it's not a foreign key constraint error
      if (e?.code !== '23503') {
        console.error("[FlappyChicken] Error saving metrics:", e);
      }
      return Promise.resolve(); // Don't throw, just fail silently
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
        // Verify user exists in profiles table before loading
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();
        
        if (profileError || !profile) {
          // User doesn't exist in profiles, use localStorage
          const saved = localStorage.getItem("flappy_chicken_highscore");
          if (saved) setHighScore(parseInt(saved));
          return;
        }
        
        const { data, error } = await supabase
          .from("flappy_chicken_metrics" as any)
          .select("high_score")
          .eq("user_id", userId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          // Only log if it's not a "not found" or foreign key constraint error
          if (error.code !== '23503') {
            console.error("Error loading high score:", error);
          }
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

    // Preload bar images - niveles 1, 2 y 3
    barTopImgRefs.current = [];
    barBottomImgRefs.current = [];
    
    // Cargar nivel 1
    const topImg1 = new Image();
    topImg1.src = barTopImg1;
    topImg1.onload = () => {
      barTopImgRefs.current[1] = topImg1;
    };
    topImg1.onerror = () => {
      console.warn("[FlappyChicken] Failed to load bar_top_1.png");
    };

    const bottomImg1 = new Image();
    bottomImg1.src = barBottomImg1;
    bottomImg1.onload = () => {
      barBottomImgRefs.current[1] = bottomImg1;
    };
    bottomImg1.onerror = () => {
      console.warn("[FlappyChicken] Failed to load bar_bottom_1.png");
    };
    
    // Cargar nivel 2
    const topImg2 = new Image();
    topImg2.src = barTopImg2;
    topImg2.onload = () => {
      barTopImgRefs.current[2] = topImg2;
    };
    topImg2.onerror = () => {
      console.warn("[FlappyChicken] Failed to load bar_top_2.png");
    };

    const bottomImg2 = new Image();
    bottomImg2.src = barBottomImg2;
    bottomImg2.onload = () => {
      barBottomImgRefs.current[2] = bottomImg2;
    };
    bottomImg2.onerror = () => {
      console.warn("[FlappyChicken] Failed to load bar_bottom_2.png");
    };
    
    // Cargar nivel 3
    const topImg3 = new Image();
    topImg3.src = barTopImg3;
    topImg3.onload = () => {
      barTopImgRefs.current[3] = topImg3;
    };
    topImg3.onerror = () => {
      console.warn("[FlappyChicken] Failed to load bar_top_3.png");
    };

    const bottomImg3 = new Image();
    bottomImg3.src = barBottomImg3;
    bottomImg3.onload = () => {
      barBottomImgRefs.current[3] = bottomImg3;
    };
    bottomImg3.onerror = () => {
      console.warn("[FlappyChicken] Failed to load bar_bottom_3.png");
    };

    // Preload background images
    bgImgRefs.current = [];
    BACKGROUND_IMAGES.forEach((imgSrc, index) => {
      const bgImg = new Image();
      bgImg.src = imgSrc;
      bgImg.onload = () => {
        bgImgRefs.current[index + 1] = bgImg; // +1 because levels are 1-indexed
      };
      bgImg.onerror = () => {
        console.warn(`[FlappyChicken] Failed to load background ${index + 1}`);
      };
    });
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
    
    try {
      // Verify user exists in profiles table before saving
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      
      if (profileError || !profile) {
        // User doesn't exist in profiles, skip saving boost
        return;
      }
      
      const boostValue = calculateBoost(finalScore);
      const durationMinutes = 60;
      
      const { error } = await supabase.rpc("add_minigame_boost" as any, {
        p_user_id: userId,
        p_boost_value: boostValue,
        p_duration_minutes: durationMinutes
      });
      
      if (!error) {
        setBoostEarned(boostValue);
      } else if (error.code !== '23503') {
        // Only log if it's not a foreign key constraint error
        console.error("[FlappyChicken] Error saving boost:", error);
      }
    } catch (e: any) {
      // Only log if it's not a foreign key constraint error
      if (e?.code !== '23503') {
        console.error("[FlappyChicken] Error saving boost:", e);
      }
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
    const ctx = canvas?.getContext("2d", { 
      alpha: true,
      desynchronized: true // Better performance on mobile
    });
    if (!canvas || !ctx) return;
    
    // Determine current background level
    const scoreForBg = isPlayingRef.current ? scoreRef.current : 0;
    const newBgLevel = getBackgroundLevel(scoreForBg);
    
    // Check if background level changed
    if (newBgLevel !== currentBgLevelRef.current && isPlayingRef.current) {
      previousBgLevelRef.current = currentBgLevelRef.current;
      currentBgLevelRef.current = newBgLevel;
      bgTransitionStartTimeRef.current = Date.now();
    }
    
    // Draw background with fade transition
    const currentBgImg = bgImgRefs.current[currentBgLevelRef.current];
    const previousBgImg = bgImgRefs.current[previousBgLevelRef.current];
    
    if (bgTransitionStartTimeRef.current !== null && previousBgImg && currentBgImg) {
      // We're in a transition
      const elapsed = Date.now() - bgTransitionStartTimeRef.current;
      const progress = Math.min(1, elapsed / BG_FADE_DURATION);
      
      // Draw previous background fading out
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      ctx.drawImage(previousBgImg, 0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.restore();
      
      // Draw new background fading in
      ctx.save();
      ctx.globalAlpha = progress;
      ctx.drawImage(currentBgImg, 0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.restore();
      
      // Clear transition when complete
      if (progress >= 1) {
        bgTransitionStartTimeRef.current = null;
      }
    } else if (currentBgImg) {
      // No transition, just draw current background
      ctx.drawImage(currentBgImg, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    } else {
      // Fallback to solid color if image not loaded
      ctx.fillStyle = "#4EC0CA";
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    
    // Draw pipes using images
    pipesRef.current.forEach(pipe => {
      const bottomPipeTop = pipe.gapY + PIPE_GAP;
      
      // Get the correct bar images for this pipe's level (fallback to level 1 if not loaded)
      const barLevel = pipe.barLevel || 1;
      const topImg = barTopImgRefs.current[barLevel] || barTopImgRefs.current[1];
      const bottomImg = barBottomImgRefs.current[barLevel] || barBottomImgRefs.current[1];
      
      // Top pipe - draw from top down to gapY
      if (topImg) {
        const topPipeHeight = pipe.gapY;
        const img = topImg;
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
      if (bottomImg) {
        const bottomPipeHeight = GAME_HEIGHT - GROUND_HEIGHT - bottomPipeTop;
        const img = bottomImg;
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
    // Reset level to 0 when not playing (use isPlayingRef for accurate state)
    const scoreForLevel = isPlayingRef.current ? scoreRef.current : 0;
    const currentLevel = getChickenLevel(scoreForLevel);
    const currentChickenImg = chickenImgRefs.current[currentLevel];
    
    // Fallback to L0 if image not loaded yet
    // IMPORTANT: Force use of currentChickenImg if it exists, don't fallback unless absolutely necessary
    let imgToDraw: HTMLImageElement | null = null;
    if (currentChickenImg) {
      imgToDraw = currentChickenImg;
    } else {
      // Only use L0 fallback if currentChickenImg is not available
      imgToDraw = chickenImgRefs.current[0] || null;
    }
    const actualImageIndex = currentChickenImg ? currentLevel : 0;
    
    // Track level changes and create particles + upgrade effect
    if (currentLevel !== lastChickenLevelRef.current && isPlayingRef.current && lastChickenLevelRef.current >= 0) {
      // Create particles when leveling up
      createLevelUpParticles(CHICKEN_X, chickenY);
      // Start upgrade effect
      chickenUpgradeEffectStartRef.current = Date.now();
      lastChickenLevelRef.current = currentLevel;
    }
    
    // Only log errors in production (not debug info)
    if (!currentChickenImg && currentLevel > 0 && isPlayingRef.current) {
      // Only log once per level change to avoid spam
      if (currentLevel !== lastChickenLevelRef.current) {
        console.warn(`[FlappyChicken] Image for level ${currentLevel} not available, using L0 fallback`);
      }
    }
    
    if (imgToDraw) {
      // Check if upgrade effect is active
      const upgradeEffectActive = chickenUpgradeEffectStartRef.current !== null;
      let upgradeProgress = 0;
      let scale = 1.0;
      let glowIntensity = 0;
      
      if (upgradeEffectActive) {
        const elapsed = Date.now() - chickenUpgradeEffectStartRef.current!;
        upgradeProgress = Math.min(1, elapsed / CHICKEN_UPGRADE_DURATION);
        
        if (upgradeProgress >= 1) {
          // Effect complete, clear it
          chickenUpgradeEffectStartRef.current = null;
        } else {
          // Calculate scale effect (grow then shrink back)
          // First half: grow from 1.0 to 1.3
          // Second half: shrink from 1.3 back to 1.0
          if (upgradeProgress < 0.5) {
            scale = 1.0 + (upgradeProgress * 2) * 0.3; // 1.0 to 1.3
          } else {
            scale = 1.3 - ((upgradeProgress - 0.5) * 2) * 0.3; // 1.3 back to 1.0
          }
          
          // Glow intensity (strongest at the middle, fades at edges)
          glowIntensity = Math.sin(upgradeProgress * Math.PI); // 0 -> 1 -> 0
        }
      }
      
      ctx.save();
      ctx.translate(CHICKEN_X + CHICKEN_SIZE / 2, chickenY + CHICKEN_SIZE / 2);
      
      // Draw glow effect during upgrade
      if (upgradeEffectActive && glowIntensity > 0) {
        const glowSize = CHICKEN_SIZE * scale * (1 + glowIntensity * 0.5);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize / 2);
        gradient.addColorStop(0, `rgba(255, 215, 0, ${glowIntensity * 0.6})`); // Gold center
        gradient.addColorStop(0.5, `rgba(255, 165, 0, ${glowIntensity * 0.4})`); // Orange middle
        gradient.addColorStop(1, `rgba(255, 215, 0, 0)`); // Transparent edge
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Apply scale transformation
      ctx.scale(scale, scale);
      
      // Rotation based on velocity - more subtle like original Flappy Bird
      let rotation = chickenVelocityRef.current * 3;
      rotation = Math.max(-30, Math.min(90, rotation));
      
      // Add extra rotation during upgrade effect (spinning effect)
      if (upgradeEffectActive && upgradeProgress < 1) {
        const spinAmount = Math.sin(upgradeProgress * Math.PI * 2) * 15; // -15 to +15 degrees
        rotation += spinAmount;
      }
      
      ctx.rotate((rotation * Math.PI) / 180);
      
      // Draw chicken with enhanced brightness during upgrade
      if (upgradeEffectActive && glowIntensity > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.3 + glowIntensity * 0.3; // Add brightness
        ctx.drawImage(
          imgToDraw,
          -CHICKEN_SIZE / 2,
          -CHICKEN_SIZE / 2,
          CHICKEN_SIZE,
          CHICKEN_SIZE
        );
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
      }
      
      // Draw main chicken image
      ctx.drawImage(
        imgToDraw,
        -CHICKEN_SIZE / 2,
        -CHICKEN_SIZE / 2,
        CHICKEN_SIZE,
        CHICKEN_SIZE
      );
      
      ctx.restore();
    }
    
    // Draw particles - optimized for mobile performance
    // Batch draw operations to reduce save/restore calls
    if (particlesRef.current.length > 0) {
      ctx.save();
      particlesRef.current.forEach(particle => {
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        // Removed shadowBlur/shadowColor - very expensive on mobile devices
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });
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
  }, [getChickenLevel, displayState, createLevelUpParticles, getBackgroundLevel]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!isPlayingRef.current) return;
    
    // Update chicken physics
    chickenVelocityRef.current += GRAVITY;
    chickenVelocityRef.current = Math.min(chickenVelocityRef.current, TERMINAL_VELOCITY);
    chickenYRef.current += chickenVelocityRef.current;
    
    // Update ground scroll
    groundOffsetRef.current += groundSpeedRef.current;
    
    // Update particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const particle = particlesRef.current[i];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.15; // gravity
      particle.life -= 0.02; // fade out
      
      // Remove dead particles
      if (particle.life <= 0 || particle.y > GAME_HEIGHT) {
        particlesRef.current.splice(i, 1);
      }
    }
    
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
      const barLevel = getBarLevelForScore(scoreRef.current);
      pipesRef.current.push({ x: GAME_WIDTH, gapY, passed: false, barLevel });
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

        // Check if level image is loaded (only log errors, not debug info)
        if (scoreRef.current % LEVELS_PER_SCORE === 0) {
          const newLevel = getChickenLevel(scoreRef.current);
          const levelImage = chickenImgRefs.current[newLevel];
          if (!levelImage) {
            console.warn(`[FlappyChicken] Image for level ${newLevel} not loaded`);
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
  }, [draw, handleGameOver, getBarLevelForScore, getChickenLevel]);

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
    particlesRef.current = []; // Clear particles
    currentBgLevelRef.current = 1; // Reset background to level 1
    previousBgLevelRef.current = 1;
    bgTransitionStartTimeRef.current = null; // Clear any ongoing transition
    chickenUpgradeEffectStartRef.current = null; // Clear upgrade effect

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
    particlesRef.current = []; // Clear particles
    currentBgLevelRef.current = 1; // Reset background to level 1
    previousBgLevelRef.current = 1;
    bgTransitionStartTimeRef.current = null; // Clear any ongoing transition
    chickenUpgradeEffectStartRef.current = null; // Clear upgrade effect

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
