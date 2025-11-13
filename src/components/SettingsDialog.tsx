import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { useAudio } from "@/contexts/AudioContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { X } from "lucide-react";
import { getVersionString } from "@/lib/version";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const [tonConnectUI] = useTonConnectUI();
  const { soundVolume, musicVolume, isMuted, setSoundVolume, setMusicVolume, setIsMuted } = useAudio();
  const { language, setLanguage, t } = useLanguage();

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
      <DialogContent className="max-w-md h-[90vh] flex flex-col p-0" hideCloseButton>
        <DialogHeader className="border-b p-4 flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-xl">{t('settings.title').toUpperCase()}</DialogTitle>
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
          {/* Audio Controls */}
          <div className="space-y-4 border border-border rounded-lg p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('settings.sound')}</label>
              <Slider
                value={[soundVolume]}
                onValueChange={handleSoundVolumeChange}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('settings.music')}</label>
              <Slider
                value={[musicVolume]}
                onValueChange={handleMusicVolumeChange}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t('settings.mute')}</label>
              <Switch checked={isMuted} onCheckedChange={setIsMuted} />
            </div>
          </div>

          {/* Language Selector */}
          <div className="space-y-2 border border-border rounded-lg p-4">
            <label className="text-sm font-medium">{t('settings.language')}</label>
            <Select value={language} onValueChange={(value: 'es' | 'en') => setLanguage(value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('settings.language')} />
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

          {/* Version Info */}
          <div className="space-y-2 border border-border rounded-lg p-4">
            <label className="text-sm font-medium">Versión</label>
            <p className="text-xs text-muted-foreground">
              {getVersionString()}
            </p>
          </div>

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
        </div>

        <div className="border-t p-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleDisconnect}>
            Disconnect
          </Button>
          <Button variant="default" className="flex-1" onClick={() => onOpenChange(false)}>
            Go back
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
