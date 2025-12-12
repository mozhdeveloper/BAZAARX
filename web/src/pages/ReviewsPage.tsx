import { useState } from 'react';
import { motion } from 'framer-motion';
import { useBuyerStore } from '../stores/buyerStore';
import Header from '../components/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import {
  Star,
  MessageSquare,
  ThumbsUp,
  Filter,
  Edit3,
  Send,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ReviewsPage() {
  const { addReview } = useBuyerStore();
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [newReview, setNewReview] = useState({
    productId: '',
    rating: 0,
    title: '',
    content: '',
    images: [] as string[]
  });

  // Demo reviews data
  const demoReviews = [
    {
      id: '1',
      productId: 'prod-1',
      productName: 'iPhone 15 Pro Max',
      productImage: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=100&h=100&fit=crop',
      rating: 5,
      title: 'Excellent Product!',
      content: 'Amazing phone with great camera quality. Fast delivery and secure packaging. Highly recommended!',
      images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=300&fit=crop'],
      date: new Date('2024-12-15'),
      helpful: 23,
      sellerName: 'TechHub PH',
      verified: true
    },
    {
      id: '2', 
      productId: 'prod-2',
      productName: 'MacBook Pro M3',
      productImage: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=100&h=100&fit=crop',
      rating: 4,
      title: 'Great laptop but expensive',
      content: 'Performance is excellent for development work. Battery life is impressive. Only downside is the price point.',
      images: [],
      date: new Date('2024-12-10'),
      helpful: 15,
      sellerName: 'Apple Store PH',
      verified: true
    },
    {
      id: '3',
      productId: 'prod-3', 
      productName: 'AirPods Pro 2',
      productImage: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=100&h=100&fit=crop',
      rating: 5,
      title: 'Perfect for daily use',
      content: 'Sound quality is amazing and noise cancellation works perfectly. Comfortable for long use.',
      images: [],
      date: new Date('2024-12-05'),
      helpful: 8,
      sellerName: 'AudioTech',
      verified: true
    }
  ];

  const filteredReviews = demoReviews.filter(review => {
    if (filter === 'all') return true;
    if (filter === 'with-photos') return review.images.length > 0;
    if (filter === 'verified') return review.verified;
    return review.rating === parseInt(filter);
  });

  const handleSubmitReview = () => {
    if (newReview.rating > 0 && newReview.content) {
      const review = {
        productId: newReview.productId,
        sellerId: 'seller-001', // In real app, get from product data
        buyerId: 'buyer-001',
        buyerName: 'Maria Santos',
        buyerAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b5e5?w=150&h=150&fit=crop&crop=face',
        rating: newReview.rating,
        comment: newReview.content,
        images: newReview.images,
        verified: true
      };
      addReview(review);
      setNewReview({
        productId: '',
        rating: 0,
        title: '',
        content: '',
        images: []
      });
    }
  };

  const StarRating = ({ rating, onRatingChange, readonly = false }: any) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onRatingChange?.(star)}
          className={cn(
            "transition-colors",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          )}
          disabled={readonly}
        >
          <Star
            className={cn(
              "h-5 w-5",
              star <= rating
                ? "fill-current text-yellow-400"
                : "text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Reviews</h1>
            <p className="text-gray-600">Share your experience with other shoppers</p>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <Edit3 className="h-4 w-4 mr-2" />
                Write Review
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Write a Review</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Product</Label>
                  <select
                    value={newReview.productId}
                    onChange={(e) => setNewReview({...newReview, productId: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select a product</option>
                    <option value="prod-1">iPhone 15 Pro Max</option>
                    <option value="prod-2">MacBook Pro M3</option>
                    <option value="prod-3">AirPods Pro 2</option>
                  </select>
                </div>
                
                <div>
                  <Label>Rating</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating 
                      rating={newReview.rating}
                      onRatingChange={(rating: number) => setNewReview({...newReview, rating})}
                    />
                    <span className="text-sm text-gray-500">
                      {newReview.rating > 0 ? `${newReview.rating} star${newReview.rating > 1 ? 's' : ''}` : 'Select rating'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <Label>Title</Label>
                  <Input
                    placeholder="Summarize your review"
                    value={newReview.title}
                    onChange={(e) => setNewReview({...newReview, title: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label>Review</Label>
                  <Textarea
                    placeholder="Tell others about your experience..."
                    rows={4}
                    value={newReview.content}
                    onChange={(e) => setNewReview({...newReview, content: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label>Photos (Optional)</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Click to upload photos</p>
                  </div>
                </div>
                
                <Button 
                  onClick={handleSubmitReview}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  disabled={!newReview.productId || !newReview.rating || !newReview.content}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit Review
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-200 p-6 mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Filter:</span>
              </div>
              <div className="flex items-center gap-2">
                {['all', '5', '4', '3', '2', '1', 'with-photos', 'verified'].map((filterOption) => (
                  <Button
                    key={filterOption}
                    variant={filter === filterOption ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(filterOption)}
                    className={filter === filterOption ? 'bg-orange-500 hover:bg-orange-600' : ''}
                  >
                    {filterOption === 'all' ? 'All' :
                     filterOption === 'with-photos' ? 'With Photos' :
                     filterOption === 'verified' ? 'Verified' :
                     `${filterOption} Star${filterOption !== '1' ? 's' : ''}`}
                  </Button>
                ))}\n              </div>
            </div>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Rated</option>
              <option value="lowest">Lowest Rated</option>
              <option value="helpful">Most Helpful</option>
            </select>
          </div>
        </motion.div>

        {/* Reviews List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {filteredReviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Product Image */}
                    <img
                      src={review.productImage}
                      alt={review.productName}
                      className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                    />
                    
                    {/* Review Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{review.productName}</h3>
                            {review.verified && (
                              <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                                Verified Purchase
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">from {review.sellerName}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500 mb-1">{review.date.toLocaleDateString()}</div>
                          <StarRating rating={review.rating} readonly />
                        </div>
                      </div>
                      
                      <h4 className="font-semibold text-lg text-gray-900 mb-2">{review.title}</h4>
                      <p className="text-gray-700 mb-4">{review.content}</p>
                      
                      {/* Review Images */}
                      {review.images.length > 0 && (
                        <div className="flex gap-2 mb-4">
                          {review.images.map((image, imgIndex) => (
                            <img
                              key={imgIndex}
                              src={image}
                              alt={`Review ${imgIndex + 1}`}
                              className="w-16 h-16 rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-80"
                            />
                          ))}
                        </div>
                      )}
                      
                      {/* Review Actions */}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <button className="flex items-center gap-1 hover:text-orange-600 transition-colors">
                          <ThumbsUp className="h-4 w-4" />
                          <span>Helpful ({review.helpful})</span>
                        </button>
                        <button className="flex items-center gap-1 hover:text-orange-600 transition-colors">
                          <MessageSquare className="h-4 w-4" />
                          <span>Reply</span>
                        </button>
                        <button className="flex items-center gap-1 hover:text-orange-600 transition-colors">
                          <Edit3 className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Empty State */}
        {filteredReviews.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No reviews found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your filters or write your first review!</p>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Write Your First Review
                </Button>
              </DialogTrigger>
            </Dialog>
          </motion.div>
        )}
      </div>
    </div>
  );
}