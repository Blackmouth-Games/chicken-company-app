import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Share2, Gift } from "lucide-react";

const Friends = () => {
  const referralLink = "https://t.me/ChickenCompany_bot?start=ref_12345";

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join Chicken Company',
        text: 'Play with me and earn rewards!',
        url: referralLink
      });
    } else {
      navigator.clipboard.writeText(referralLink);
      // You could add a toast notification here
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Invite Friends</h1>
          <p className="text-muted-foreground">
            Earn rewards by inviting your friends
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Referral Rewards
            </CardTitle>
            <CardDescription>
              Get bonuses when your friends join and play
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-2xl font-bold text-primary">0</p>
                <p className="text-sm text-muted-foreground">Friends Invited</p>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-2xl font-bold text-primary">0</p>
                <p className="text-sm text-muted-foreground">Rewards Earned</p>
              </div>
            </div>

            <Button 
              className="w-full" 
              size="lg"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Referral Link
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Your Friends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No friends invited yet</p>
              <p className="text-sm">Start sharing to see your referrals here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Friends;
