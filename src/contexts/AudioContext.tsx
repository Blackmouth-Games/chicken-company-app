import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AudioContextType {
  soundVolume: number;
  musicVolume: number;
  isMuted: boolean;
  setSoundVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  setIsMuted: (muted: boolean) => void;
  playSound: (sound: HTMLAudioElement) => void;
  playMusic: (music: HTMLAudioElement) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SOUND_VOLUME: "chicken_sound_volume",
  MUSIC_VOLUME: "chicken_music_volume",
  IS_MUTED: "chicken_is_muted",
};

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [soundVolume, setSoundVolumeState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SOUND_VOLUME);
    return saved ? parseInt(saved) : 50;
  });

  const [musicVolume, setMusicVolumeState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MUSIC_VOLUME);
    return saved ? parseInt(saved) : 50;
  });

  const [isMuted, setIsMutedState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.IS_MUTED);
    return saved === "true";
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SOUND_VOLUME, soundVolume.toString());
  }, [soundVolume]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MUSIC_VOLUME, musicVolume.toString());
  }, [musicVolume]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.IS_MUTED, isMuted.toString());
  }, [isMuted]);

  const setSoundVolume = (volume: number) => {
    setSoundVolumeState(volume);
  };

  const setMusicVolume = (volume: number) => {
    setMusicVolumeState(volume);
  };

  const setIsMuted = (muted: boolean) => {
    setIsMutedState(muted);
  };

  const playSound = (sound: HTMLAudioElement) => {
    if (isMuted) return;
    sound.volume = soundVolume / 100;
    sound.currentTime = 0;
    sound.play().catch((error) => {
      console.error("Error playing sound:", error);
    });
  };

  const playMusic = (music: HTMLAudioElement) => {
    music.volume = musicVolume / 100;
    music.loop = true;
    
    if (isMuted) {
      music.pause();
      return;
    }
    
    // Try to play and handle autoplay restrictions
    const playPromise = music.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("Music playing successfully");
        })
        .catch((error) => {
          // Autoplay was prevented - this is normal on first load
          console.log("Autoplay prevented, waiting for user interaction:", error);
        });
    }
  };

  return (
    <AudioContext.Provider
      value={{
        soundVolume,
        musicVolume,
        isMuted,
        setSoundVolume,
        setMusicVolume,
        setIsMuted,
        playSound,
        playMusic,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
};
