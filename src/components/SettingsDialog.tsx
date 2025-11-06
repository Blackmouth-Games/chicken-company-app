import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { useAudio } from "@/contexts/AudioContext";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const APP_VERSION = "1.0";

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const [tonConnectUI] = useTonConnectUI();
  const { soundVolume, musicVolume, isMuted, setSoundVolume, setMusicVolume, setIsMuted } = useAudio();
  const [language, setLanguage] = useState("es");

  const handleDisconnect = async () => {
    await tonConnectUI.disconnect();
  };

  const handleSoundVolumeChange = (value: number[]) => {
    setSoundVolume(value[0]);
  };

  const handleMusicVolumeChange = (value: number[]) => {
    setMusicVolume(value[0]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">SETTINGS</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Audio Controls */}
          <div className="space-y-4 border border-border rounded-lg p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sound</label>
              <Slider
                value={[soundVolume]}
                onValueChange={handleSoundVolumeChange}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Music</label>
              <Slider
                value={[musicVolume]}
                onValueChange={handleMusicVolumeChange}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Mute</label>
              <Switch checked={isMuted} onCheckedChange={setIsMuted} />
            </div>
          </div>

          {/* Language Selector */}
          <div className="space-y-2 border border-border rounded-lg p-4">
            <label className="text-sm font-medium">Language</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* TOS & EULA Button */}
          <Button variant="outline" className="w-full">
            TOS & EULA
          </Button>

          {/* Social Media Links */}
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("https://t.me/ChickenCo_io", "_blank")}
            >
              TG
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("https://x.com/ChickenCo_io", "_blank")}
            >
              X
            </Button>
          </div>

          {/* Version */}
          <div className="text-center text-sm text-muted-foreground italic">
            Version {APP_VERSION}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleDisconnect}>
              Disconnect
            </Button>
            <Button variant="default" className="flex-1" onClick={() => onOpenChange(false)}>
              Go back
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
