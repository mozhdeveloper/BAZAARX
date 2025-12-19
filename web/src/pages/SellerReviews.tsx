import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  MessageSquare, 
  ThumbsUp,
  Search,
  TrendingUp,
  Package,
  ShoppingCart,
  Settings,
  LayoutDashboard,
  Reply,
  Flag,
  Check,
  Store,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const sellerLinks = [
  {
    label: "Dashboard",
    href: "/seller",
    icon: <LayoutDashboard className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
  },
  {
    label: "Store Profile",
    href: "/seller/store-profile",
    icon: <Store className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
  },
  {
    label: "Products", 
    href: "/seller/products",
    icon: <Package className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
  },
  {
    label: "Orders",
    href: "/seller/orders",
    icon: <ShoppingCart className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
  },
  {
    label: "Earnings",
    href: "/seller/earnings",
    icon: <Wallet className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
  },
  {
    label: "Reviews",
    href: "/seller/reviews",
    icon: <Star className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
  },
  {
    label: "Analytics",
    href: "/seller/analytics",
    icon: <TrendingUp className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
  },
  {
    label: "Settings",
    href: "/seller/settings",
    icon: <Settings className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
  }
];

const Logo = () => (
  <Link to="/seller" className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20">
    <img 
      src="/Logo.png" 
      alt="BazaarPH Logo" 
      className="h-8 w-8 object-contain flex-shrink-0"
    />
    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-semibold text-gray-900 whitespace-pre">
      BazaarPH Seller
    </motion.span>
  </Link>
);

const LogoIcon = () => (
  <Link to="/seller" className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20">
    <img 
      src="/Logo.png" 
      alt="BazaarPH Logo" 
      className="h-8 w-8 object-contain flex-shrink-0"
    />
  </Link>
);

// Mock reviews data
const mockReviews = [
  {
    id: 'r1',
    productId: 'p1',
    productName: 'Premium Wireless Earbuds - Noise Cancelling',
    productImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=100&h=100&fit=crop',
    buyerName: 'Maria Santos',
    buyerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop',
    rating: 5,
    comment: 'Excellent product! Sound quality is amazing and battery life lasts the whole day. Highly recommended!',
    images: [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=300&h=300&fit=crop'
    ],
    helpful: 24,
    date: new Date('2024-12-10'),
    verified: true,
    reply: null
  },
  {
    id: 'r2',
    productId: 'p2',
    productName: 'Smart Watch Fitness Tracker',
    productImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&h=100&fit=crop',
    buyerName: 'Juan dela Cruz',
    buyerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop',
    rating: 4,
    comment: 'Great fitness tracker for the price. The only downside is the battery drains faster than expected when GPS is on.',
    images: [],
    helpful: 15,
    date: new Date('2024-12-12'),
    verified: true,
    reply: {
      message: 'Thank you for your feedback! We recommend turning off GPS when not actively tracking workouts to extend battery life. Feel free to reach out if you need any assistance.',
      date: new Date('2024-12-13')
    }
  },
  {
    id: 'r3',
    productId: 'p1',
    productName: 'Premium Wireless Earbuds - Noise Cancelling',
    productImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=100&h=100&fit=crop',
    buyerName: 'Ana Reyes',
    buyerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop',
    rating: 5,
    comment: 'Best purchase this year! Noise cancellation is perfect for my daily commute. Worth every peso!',
    images: [
      'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=300&h=300&fit=crop'
    ],
    helpful: 31,
    date: new Date('2024-12-14'),
    verified: true,
    reply: null
  },
  {
    id: 'r4',
    productId: 'p3',
    productName: 'Portable Power Bank 20000mAh',
    productImage: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=100&h=100&fit=crop',
    buyerName: 'Carlo Rodriguez',
    buyerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop',
    rating: 3,
    comment: 'Product arrived late and packaging was slightly damaged. Power bank works fine though.',
    images: [],
    helpful: 8,
    date: new Date('2024-12-11'),
    verified: true,
    reply: null
  },
  {
    id: 'r5',
    productId: 'p2',
    productName: 'Smart Watch Fitness Tracker',
    productImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&h=100&fit=crop',
    buyerName: 'Sofia Garcia',
    buyerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop',
    rating: 5,
    comment: 'Amazing smartwatch! Tracks all my workouts accurately. The heart rate monitor is very precise.',
    images: [],
    helpful: 19,
    date: new Date('2024-12-15'),
    verified: true,
    reply: null
  }
];

export function SellerReviews() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState('all');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const filteredReviews = mockReviews.filter(review => {
    const matchesSearch = 
      review.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.comment.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterRating === 'all' || review.rating === parseInt(filterRating);
    
    return matchesSearch && matchesFilter;
  });

  const reviewStats = {
    total: mockReviews.length,
    average: (mockReviews.reduce((sum, r) => sum + r.rating, 0) / mockReviews.length).toFixed(1),
    fiveStar: mockReviews.filter(r => r.rating === 5).length,
    fourStar: mockReviews.filter(r => r.rating === 4).length,
    threeStar: mockReviews.filter(r => r.rating === 3).length,
    twoStar: mockReviews.filter(r => r.rating === 2).length,
    oneStar: mockReviews.filter(r => r.rating === 1).length,
    needsReply: mockReviews.filter(r => !r.reply).length,
    withPhotos: mockReviews.filter(r => r.images.length > 0).length
  };

  const handleReply = (reviewId: string) => {
    setSelectedReview(reviewId);
    setShowReplyModal(true);
  };

  const submitReply = () => {
    // In real app, this would call an API
    console.log('Submitting reply:', replyText, 'for review:', selectedReview);
    setShowReplyModal(false);
    setReplyText('');
    setSelectedReview(null);
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {sellerLinks.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reviews & Ratings</h1>
            <p className="text-gray-600">Manage customer feedback and respond to reviews</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Average Rating</p>
                    <p className="text-3xl font-bold text-gray-900">{reviewStats.average}</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-full">
                    <Star className="h-6 w-6 text-yellow-600 fill-current" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                  <span className="text-sm text-gray-500 ml-2">({reviewStats.total} reviews)</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Reviews</p>
                    <p className="text-3xl font-bold text-gray-900">{reviewStats.total}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  {reviewStats.withPhotos} with photos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Needs Reply</p>
                    <p className="text-3xl font-bold text-gray-900">{reviewStats.needsReply}</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-full">
                    <Reply className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  {((reviewStats.needsReply / reviewStats.total) * 100).toFixed(0)}% pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">5 Star Reviews</p>
                    <p className="text-3xl font-bold text-gray-900">{reviewStats.fiveStar}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <ThumbsUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  {((reviewStats.fiveStar / reviewStats.total) * 100).toFixed(0)}% of total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Rating Breakdown */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Rating Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map(rating => {
                  const count = rating === 5 ? reviewStats.fiveStar : 
                                rating === 4 ? reviewStats.fourStar :
                                rating === 3 ? reviewStats.threeStar :
                                rating === 2 ? reviewStats.twoStar : reviewStats.oneStar;
                  const percentage = (count / reviewStats.total) * 100;
                  
                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-24">
                        <span className="text-sm text-gray-600">{rating}</span>
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-16 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search reviews by product, customer, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            <AnimatePresence>
              {filteredReviews.map((review) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      {/* Review Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <img
                          src={review.productImage}
                          alt={review.productName}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">{review.productName}</h3>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    "h-4 w-4",
                                    i < review.rating
                                      ? "text-yellow-400 fill-current"
                                      : "text-gray-300"
                                  )}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">
                              {review.date.toLocaleDateString()}
                            </span>
                            {review.verified && (
                              <Badge variant="outline" className="text-green-600 border-green-200">
                                <Check className="h-3 w-3 mr-1" />
                                Verified Purchase
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="flex items-center gap-3 mb-4">
                        <img
                          src={review.buyerAvatar}
                          alt={review.buyerName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{review.buyerName}</p>
                          <p className="text-sm text-gray-500">Customer</p>
                        </div>
                      </div>

                      {/* Review Content */}
                      <p className="text-gray-700 mb-4">{review.comment}</p>

                      {/* Review Images */}
                      {review.images.length > 0 && (
                        <div className="flex gap-2 mb-4">
                          {review.images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`Review ${idx + 1}`}
                              className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            />
                          ))}
                        </div>
                      )}

                      {/* Helpful Count */}
                      <div className="flex items-center gap-4 mb-4">
                        <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                          <ThumbsUp className="h-4 w-4" />
                          <span>{review.helpful} found this helpful</span>
                        </button>
                      </div>

                      {/* Seller Reply */}
                      {review.reply ? (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-orange-500">Seller Response</Badge>
                            <span className="text-sm text-gray-500">
                              {review.reply.date.toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-700">{review.reply.message}</p>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleReply(review.id)}
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                          >
                            <Reply className="h-4 w-4 mr-2" />
                            Reply to Review
                          </Button>
                          <Button size="sm" variant="outline">
                            <Flag className="h-4 w-4 mr-2" />
                            Report
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredReviews.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
              <p className="text-gray-600">
                {searchQuery || filterRating !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Reviews will appear here when customers leave feedback'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reply Modal */}
      {showReplyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reply to Review</h3>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your response to the customer..."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
              rows={6}
            />
            <div className="flex gap-3 mt-4">
              <Button
                onClick={() => {
                  setShowReplyModal(false);
                  setReplyText('');
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={submitReply}
                disabled={!replyText.trim()}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              >
                Send Reply
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
