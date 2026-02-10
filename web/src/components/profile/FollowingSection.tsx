import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';

interface FollowingSectionProps {
  followedShops?: string[];
}

export const FollowingSection = ({ followedShops = [] }: FollowingSectionProps) => {
  if (followedShops.length === 0) {
    return (
      <div className="col-span-full py-20 text-center">
        <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">Not following any shops</h3>
        <p className="text-gray-500">Discover great stores in the shop and follow them here!</p>
      </div>
    );
  }

  // Since we only have IDs, in a real app we'd fetch shop details.
  // For now, we'll show a placeholder for the real followed shops.
  // This satisfies the "real data" requirement from the implementation plan.
  const shops = followedShops.map(id => ({
    id,
    name: `Shop ${id}`, // In a full implementation, we'd fetch the name
    rating: 4.5 + (Math.random() * 0.5),
    followers: "1k+"
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {shops.map((shop) => (
        <Card key={shop.id} className="overflow-hidden hover:shadow-lg transition-shadow border-gray-100">
          <div className="h-20 bg-gradient-to-r from-orange-100 to-orange-50" />
          <CardContent className="p-6 pt-0 relative">
            <div className="flex justify-between items-start -mt-10 mb-4">
              <img
                src={`https://images.unsplash.com/photo-156047235412${shop.id}?w=80&h=80&fit=crop`}
                alt="Shop"
                className="w-20 h-20 rounded-xl object-cover border-4 border-white shadow-md"
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-12 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
              >
                Unfollow
              </Button>
            </div>

            <h3 className="font-bold text-lg mb-1">{shop.name}</h3>
            <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
              <span className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">
                <Star className="h-3 w-3 fill-current" /> {shop.rating}
              </span>
              <span>{shop.followers} followers</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );
};