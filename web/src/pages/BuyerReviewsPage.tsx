import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Star,
  Package,
  ThumbsUp,
  MessageSquare,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Filter,
  ChevronLeft
} from 'lucide-react';
import { cn } from '../lib/utils';

// Mock reviews data
const mockReviews = [
  {
    id: '1',
    productId: 'p1',
    productName: 'Premium Wireless Earbuds',
    productImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200',
    orderId: 'ORD-2024-001',
    rating: 5,
    comment: 'Excellent product! The sound quality is amazing and the battery life is outstanding. Highly recommend!',
    images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400'],
    date: new Date('2024-01-05'),
    sellerReply: 'Thank you for your positive feedback! We\'re glad you love the product.',
    helpful: 12,
    status: 'published'
  },
  {
    id: '2',
    productId: 'p2',
    productName: 'Sustainable Water Bottle',
    productImage: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=200',
    orderId: 'ORD-2024-002',
    rating: 4,
    comment: 'Good quality bottle, keeps water cold for hours. Only issue is the cap is a bit tight.',
    images: [],
    date: new Date('2024-01-03'),
    sellerReply: null,
    helpful: 8,
    status: 'published'
  },
  {
    id: '3',
    productId: 'p3',
    productName: 'Leather Laptop Bag',
    productImage: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200',
    orderId: 'ORD-2023-152',
    rating: 5,
    comment: 'Beautiful craftsmanship! The leather quality is top-notch and the design is very professional.',
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400'],
    date: new Date('2023-12-28'),
    sellerReply: 'We appreciate your kind words! Thank you for supporting local craftsmanship.',
    helpful: 15,
    status: 'published'
  },
  {
    id: '4',
    productId: 'p4',
    productName: 'Organic Coffee Beans',
    productImage: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=200',
    orderId: 'ORD-2023-145',
    rating: 3,
    comment: 'Decent coffee but a bit too strong for my taste. Packaging was good.',
    images: [],
    date: new Date('2023-12-20'),
    sellerReply: null,
    helpful: 3,
    status: 'published'
  }
];

export default function BuyerReviewsPage() {
  const navigate = useNavigate();
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const filteredReviews = mockReviews.filter(review => {
    if (selectedRating && review.rating !== selectedRating) return false;
    return true;
  });

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating
              ? 'fill-[var(--brand-primary)] text-[var(--brand-primary)]'
              : 'text-[var(--text-muted)]'
              }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--brand-wash)]">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors mb-4 group"
          >
            <ChevronLeft
              size={20}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
            <span className="text-sm font-medium">Back</span>
          </button>

          <h1 className="text-3xl font-extrabold font-heading text-[var(--text-headline)] tracking-tight mb-2">My Reviews</h1>
          <p className="text-[var(--text-muted)]">Manage and view all your product reviews</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: 'Total Reviews',
              value: mockReviews.length,
              icon: <MessageSquare className="h-5 w-5" />,
              delay: 0.1
            },
            {
              title: 'Average Rating',
              value: (mockReviews.reduce((acc, r) => acc + r.rating, 0) / mockReviews.length).toFixed(1),
              icon: <Star className="h-5 w-5" />,
              fillIcon: true,
              delay: 0.2
            },
            {
              title: 'Helpful Votes',
              value: mockReviews.reduce((acc, r) => acc + r.helpful, 0),
              icon: <ThumbsUp className="h-5 w-5" />,
              delay: 0.3
            },
            {
              title: 'With Photos',
              value: mockReviews.filter(r => r.images.length > 0).length,
              icon: <ImageIcon className="h-5 w-5" />,
              delay: 0.4
            }
          ].map((metric, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: metric.delay }}
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] relative overflow-hidden group transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-100 transition-colors"></div>

              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-all">
                  {metric.icon}
                </div>
              </div>
              <div className="relative z-10">
                <h3 className="text-[var(--text-muted)] text-sm">{metric.title}</h3>
                <div className="flex items-end gap-3 mt-1">
                  <p className="text-2xl font-black text-[var(--text-headline)] font-heading group-hover:text-[var(--brand-primary)] transition-all">
                    {metric.value}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8 flex flex-col lg:flex-row items-stretch lg:items-center gap-4"
        >
          <div className="flex-1 relative min-w-0">
            <div className="overflow-x-auto scrollbar-hide pb-0.5">
              <div className="inline-flex items-center p-1 bg-white rounded-full border border-orange-100/50 shadow-sm min-w-full md:min-w-max">
                <div className="px-4 py-1.5 text-[11px] sm:text-xs font-bold text-[var(--brand-primary)] uppercase tracking-wider border-r border-orange-100/50 mr-2 flex items-center gap-2">
                  <Filter className="h-3 w-3" />
                  Rating
                </div>
                <button
                  onClick={() => setSelectedRating(null)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all duration-300",
                    selectedRating === null
                      ? "bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-primary)]/20"
                      : "text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50",
                  )}
                >
                  All
                </button>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setSelectedRating(rating)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all duration-300 flex items-center gap-1",
                      selectedRating === rating
                        ? "bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-primary)]/20"
                        : "text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50",
                    )}
                  >
                    {rating} <Star className={cn("h-3 w-3", selectedRating === rating ? "fill-white" : "fill-current")} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="space-y-4">
          {filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-16 w-16 text-[var(--text-muted)] mx-auto mb-4" />
                <p className="text-[var(--text-muted)] text-lg">No reviews found</p>
                <p className="text-[var(--text-muted)] text-sm">Start reviewing products you've purchased!</p>
              </CardContent>
            </Card>
          ) : (
            filteredReviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-transparent hover:border-orange-100 group">
                  <div className="p-6">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <img
                        src={review.productImage}
                        alt={review.productName}
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      />

                      {/* Review Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-[var(--text-headline)] mb-1">
                              {review.productName}
                            </h3>
                            <div className="flex items-center gap-3 mb-2">
                              {renderStars(review.rating)}
                              <span className="text-sm text-[var(--text-muted)]">
                                {review.date.toLocaleDateString()}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                <Package className="h-3 w-3 mr-1" />
                                {review.orderId}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <p className="text-[var(--text-primary)] mb-3">{review.comment}</p>

                        {/* Review Images */}
                        {review.images.length > 0 && (
                          <div className="flex gap-2 mb-3">
                            {review.images.map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`Review ${idx + 1}`}
                                className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-75 transition-opacity"
                              />
                            ))}
                          </div>
                        )}

                        {/* Seller Reply */}
                        {review.sellerReply && (
                          <div className="bg-[var(--brand-wash)] rounded-lg p-4 mt-3 border-l-4 border-[var(--brand-primary)]">
                            <p className="text-sm font-medium text-[var(--text-headline)] mb-1">Seller's Response:</p>
                            <p className="text-sm text-[var(--text-primary)]">{review.sellerReply}</p>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--brand-wash-gold)]/20">
                          <button className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)]">
                            <ThumbsUp className="h-4 w-4" />
                            <span>{review.helpful} found this helpful</span>
                          </button>
                          <Badge
                            className={
                              review.status === 'published'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }
                          >
                            {review.status === 'published' ? 'Published' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <BazaarFooter />
    </div >
  );
}
