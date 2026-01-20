import { ArrowRight, BarChart3, Package, TrendingUp, Users } from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CombinedFeaturedSection from "@/components/ui/combined-featured-section";
import { Link } from "react-router-dom";

const SAMPLE_PRICES = [899, 1299, 1599];

export function Hero195() {
  return (
    <>
      <section className="bg-[#FFF5F2]/80 py-16 sm:py-20 md:py-24 relative overflow-hidden border-y border-[#FF5722]/10">
        {/* Background decoration */}
        <div className="absolute -top-12 -right-12 sm:-top-24 sm:-right-24 w-64 h-64 sm:w-96 sm:h-96 bg-[#FF5722]/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-12 -left-12 sm:-bottom-24 sm:-left-24 w-64 h-64 sm:w-96 sm:h-96 bg-[#FF5722]/10 rounded-full blur-3xl opacity-50" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 sm:gap-16 items-center">
            {/* Left Column - Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-1.5 rounded-full border border-[#FF5722]/20 bg-white text-[#FF5722] text-xs sm:text-sm font-bold tracking-widest uppercase mb-6">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                Powerful Dashboard Preview
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#1a2b3b] leading-[1.1] mb-6">
                Your Complete
                <br />
                <span className="text-[#FF6A00]">Seller Dashboard</span>
              </h1>

              <p className="text-base sm:text-lg text-gray-600 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                Experience our powerful seller tools designed for Filipino entrepreneurs.
                Manage inventory, track sales, and grow your business with real-time analytics
                and AI-powered insights.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/seller/auth">
                  <Button size="lg" className="w-full sm:w-auto bg-[#FF6A00] hover:bg-[#FF5722] text-white">
                    Start Selling Now
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-gray-200 text-gray-700 hover:bg-white hover:text-[#FF6A00]">
                  Watch Demo
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mt-12 max-w-md mx-auto lg:mx-0">
                <div className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-bold text-[#1a2b3b]">15K+</div>
                  <div className="text-xs sm:text-sm text-gray-600">Active Sellers</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-bold text-[#1a2b3b]">₱2.5M</div>
                  <div className="text-xs sm:text-sm text-gray-600">Daily Sales</div>
                </div>
                <div className="text-center lg:text-left col-span-2 sm:col-span-1">
                  <div className="text-2xl sm:text-3xl font-bold text-[#1a2b3b]">4.9★</div>
                  <div className="text-xs sm:text-sm text-gray-600">Avg. Rating</div>
                </div>
              </div>
            </div>

            {/* Right Column - Dashboard Preview */}
            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              <Card className="relative bg-white/80 backdrop-blur-sm shadow-2xl overflow-hidden">
                <BorderBeam size={250} duration={12} delay={9} />

                <CardContent className="p-4 sm:p-6">
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-6 h-auto p-1">
                      <TabsTrigger value="overview" className="text-[10px] sm:text-xs flex-col sm:flex-row gap-1 py-2 sm:py-1.5 h-auto">
                        <BarChart3 className="w-3 h-3 sm:mr-1" />
                        Overview
                      </TabsTrigger>
                      <TabsTrigger value="products" className="text-[10px] sm:text-xs flex-col sm:flex-row gap-1 py-2 sm:py-1.5 h-auto">
                        <Package className="w-3 h-3 sm:mr-1" />
                        Products
                      </TabsTrigger>
                      <TabsTrigger value="customers" className="text-[10px] sm:text-xs flex-col sm:flex-row gap-1 py-2 sm:py-1.5 h-auto">
                        <Users className="w-3 h-3 sm:mr-1" />
                        Customers
                      </TabsTrigger>
                      <TabsTrigger value="analytics" className="text-[10px] sm:text-xs flex-col sm:flex-row gap-1 py-2 sm:py-1.5 h-auto">
                        <TrendingUp className="w-3 h-3 sm:mr-1" />
                        Analytics
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
                          <CardContent className="p-4">
                            <div className="text-xs sm:text-sm opacity-90 mb-1">Today's Sales</div>
                            <div className="text-xl sm:text-2xl font-bold">₱45,230</div>
                            <div className="text-[10px] sm:text-xs opacity-75 mt-1">+12% from yesterday</div>
                          </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                          <CardContent className="p-4">
                            <div className="text-xs sm:text-sm opacity-90 mb-1">Orders</div>
                            <div className="text-xl sm:text-2xl font-bold">127</div>
                            <div className="text-[10px] sm:text-xs opacity-75 mt-1">+8% from yesterday</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Mini Chart Visualization */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm font-medium mb-3">Sales This Week</div>
                          <div className="flex items-end justify-between h-24 gap-2">
                            {[40, 65, 45, 80, 60, 90, 75].map((height, i) => (
                              <div
                                key={i}
                                className="flex-1 bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-sm transition-all hover:from-orange-600 hover:to-orange-500"
                                style={{ height: `${height}%` }}
                              />
                            ))}
                          </div>
                          <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 mt-2">
                            <span>Mon</span>
                            <span>Tue</span>
                            <span>Wed</span>
                            <span>Thu</span>
                            <span>Fri</span>
                            <span>Sat</span>
                            <span>Sun</span>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="products" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="product-name" className="text-sm">Quick Add Product</Label>
                        <Input id="product-name" placeholder="Product name" className="text-sm" />
                        <Input type="number" placeholder="Price (₱)" className="text-sm" />
                        <Button className="w-full bg-orange-600 hover:bg-orange-700 text-sm">
                          Add Product
                        </Button>
                      </div>

                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm font-medium mb-2">Recent Products</div>
                          <div className="space-y-2">
                            {["Premium Wireless Earbuds", "Sustainable Water Bottle", "Filipino Woven Bag"].map((product, i) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <div className="w-8 h-8 bg-orange-200 rounded flex-shrink-0" />
                                  <span className="text-xs sm:text-sm truncate">{product}</span>
                                </div>
                                <span className="text-xs sm:text-sm font-medium whitespace-nowrap ml-2">₱{SAMPLE_PRICES[i]}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="customers" className="space-y-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm font-medium mb-3">Customer Insights</div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm text-gray-600">Total Customers</span>
                              <span className="text-base sm:text-lg font-bold">1,247</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm text-gray-600">New This Month</span>
                              <span className="text-base sm:text-lg font-bold text-green-600">+89</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm text-gray-600">Repeat Customers</span>
                              <span className="text-base sm:text-lg font-bold">67%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
                        <CardContent className="p-4">
                          <div className="text-xs sm:text-sm opacity-90 mb-2">Customer Satisfaction</div>
                          <div className="text-2xl sm:text-3xl font-bold mb-1">4.8/5.0</div>
                          <div className="text-[10px] sm:text-xs opacity-75">Based on 856 reviews</div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="analytics" className="space-y-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm font-medium mb-3">Growth Metrics</div>
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-xs sm:text-sm mb-1">
                                <span>Revenue Growth</span>
                                <span className="font-medium text-green-600">+24%</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-green-500 to-green-600 w-[76%]" />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs sm:text-sm mb-1">
                                <span>Customer Retention</span>
                                <span className="font-medium text-blue-600">+18%</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 w-[82%]" />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs sm:text-sm mb-1">
                                <span>Product Views</span>
                                <span className="font-medium text-orange-600">+31%</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-orange-500 to-orange-600 w-[69%]" />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </section>

      {/* Combined Featured Section - Dashboard Capabilities */}
      <CombinedFeaturedSection />
    </>
  );
}
