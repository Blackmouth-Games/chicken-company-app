import { ReactNode } from "react";
import BottomNav from "./BottomNav";
import DebugPanel from "./DebugPanel";

interface TelegramLayoutProps {
  children: ReactNode;
}

const TelegramLayout = ({ children }: TelegramLayoutProps) => {
  return (
    <div className="min-h-screen pb-16">
      {children}
      <BottomNav />
      <DebugPanel />
    </div>
  );
};

export default TelegramLayout;
