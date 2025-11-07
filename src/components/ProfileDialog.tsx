import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Edit } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import defaultAvatar from "@/assets/default-avatar.png";
import { getTelegramUser } from "@/lib/telegram";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileDialog = ({ open, onOpenChange }: ProfileDialogProps) => {
  const telegramUser = getTelegramUser();
  const displayName = telegramUser?.first_name 
    ? `${telegramUser.first_name}${telegramUser.last_name ? ' ' + telegramUser.last_name : ''}`
    : 'Guest';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[90vh] flex flex-col p-0" hideCloseButton>
        <DialogHeader className="border-b p-4 flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-xl">Profile</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col items-center gap-6">
            {/* Profile Image */}
            <div className="relative">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="relative group">
                      <img
                        src={defaultAvatar}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover"
                      />
                      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Edit className="w-6 h-6 text-white" />
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Coming soon</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* User Name */}
            <div className="text-center">
              <h2 className="text-2xl font-bold">{displayName}</h2>
              {telegramUser?.username && (
                <p className="text-sm text-muted-foreground mt-1">
                  @{telegramUser.username}
                </p>
              )}
            </div>

            {/* Coming Soon Section */}
            <div className="w-full mt-8 p-6 bg-muted/50 rounded-lg text-center">
              <p className="text-muted-foreground">Coming soon</p>
              <p className="text-sm text-muted-foreground/70 mt-2">
                More features will be added here
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
