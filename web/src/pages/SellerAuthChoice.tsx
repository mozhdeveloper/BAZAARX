import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, ArrowRight, UserPlus, LogIn } from 'lucide-react';

export function SellerAuthChoice() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="h-20 w-20 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Store className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to BazaarPH Seller</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Start your journey as a seller on BazaarPH. Join thousands of Filipino entrepreneurs selling their products online.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Register Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Link to="/seller/register">
              <div className="bg-white rounded-2xl shadow-xl p-8 h-full hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-orange-500 group">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-14 w-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UserPlus className="h-7 w-7 text-white" />
                  </div>
                  <ArrowRight className="h-6 w-6 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Create New Account</h2>
                <p className="text-gray-600 mb-6">
                  New to BazaarPH? Register your business and start selling today. Complete our simple application process and get approved by our team.
                </p>
                
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-orange-500 rounded-full"></div>
                    <span>Quick 5-step registration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-orange-500 rounded-full"></div>
                    <span>Admin approval in 1-3 business days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-orange-500 rounded-full"></div>
                    <span>Free to join and list products</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="inline-flex items-center gap-2 text-orange-600 font-medium group-hover:gap-3 transition-all">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link to="/seller/login">
              <div className="bg-white rounded-2xl shadow-xl p-8 h-full hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-orange-500 group">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <LogIn className="h-7 w-7 text-white" />
                  </div>
                  <ArrowRight className="h-6 w-6 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Sign In to Your Account</h2>
                <p className="text-gray-600 mb-6">
                  Already have a seller account? Sign in to access your dashboard, manage products, and track your sales.
                </p>
                
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-blue-500 rounded-full"></div>
                    <span>Access your seller dashboard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-blue-500 rounded-full"></div>
                    <span>Manage products and orders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-blue-500 rounded-full"></div>
                    <span>View analytics and reports</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="inline-flex items-center gap-2 text-blue-600 font-medium group-hover:gap-3 transition-all">
                    Sign In Now
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Back to Home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-8"
        >
          <Link to="/" className="text-gray-600 hover:text-orange-600 transition-colors inline-flex items-center gap-2">
            ← Back to BazaarPH
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
