import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';

interface Shop {
  id: number;
  name: string;
  rating: number;
  followers: string;
}

export const FollowingSection = () => {
  // Mock data for demonstration - replace with actual followed shops data
  const mockShops: Shop[] = [
    { id: 1, name: "TechHub Philippines", rating: 4.8, followers: "2.5k" },
    { id: 2, name: "Fashion Forward PH", rating: 4.6, followers: "1.8k" },
    { id: 3, name: "Home Essentials PH", rating: 4.9, followers: "3.2k" }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {mockShops.map((shop) => (
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