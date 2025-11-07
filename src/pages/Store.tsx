import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Package, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Store = () => {
  const storeItems = [
    {
      id: 1,
      name: "Premium Coop",
      description: "Unlock exclusive premium chicken coops with higher capacity",
      price: "10 TON",
      icon: Package,
    },
    {
      id: 2,
      name: "Speed Boost",
      description: "Increase egg production speed by 50% for 24 hours",
      price: "5 TON",
      icon: Star,
    },
    {
      id: 3,
      name: "Mega Storage",
      description: "Double your storage capacity permanently",
      price: "15 TON",
      icon: ShoppingBag,
    },
  ];

  return (
    <div className="min-h-screen bg-background p-6 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Store</h1>
          <p className="text-muted-foreground">
            Upgrade your farm with premium items
          </p>
        </div>

        <div className="grid gap-4">
          {storeItems.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {item.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-bold text-primary">{item.price}</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button>Buy Now</Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Coming soon</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">More items coming soon!</p>
              <p className="text-xs text-muted-foreground">
                We're constantly adding new items to help you build the ultimate chicken farm
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Store;
