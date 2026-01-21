import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, ArrowRight, UserPlus, LogIn, TrendingUp, CheckCircle } from 'lucide-react';

export function SellerAuthChoice() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 ">
      <header className='border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10'>
        <div className='max-w-7xl mx-auto px-6 py-4 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg'>
              <Store className='w-6 h-6 text-white' />
            </div>
            <span className='text-xl font-bold bg-gradient-to-r from-orange-600 to to-orange-500 bg-clip-text text-transparent'>
              BazaarPH
            </span>
          </div>
          <Link to='/' className='text-sm text-gray-600 hover:text-gray-900 transition-colors'>
            ← Back to BazaarPH
          </Link>
        </div>
      </header>

      <main className='max-w-5xl mx-auto px-6 py-14'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}>

            <div className='text-center mb-16 animate-fade-in'>
              <div className='inline-flex items-center gap-2 px-4 py-3 bg-orange-100 rounded-full text-orange-700 text-medium font-medium mb-12'>
                <TrendingUp className='w-5 h-5'/>
                Join +10,000 Filipino Sellers
              </div>
              <h1 className='text-5xl font-bold text-gray-900 mb-3'>
                Welcome to BazaarPH Seller
              </h1>
              <p className='text-xl text-gray-600 max-w-2xl mx-auto'>
                Start your journey as a seller on BazaarPH. Join thousands of Filipino 
                entrepreneurs selling their products online.
              </p>
            </div>
        </motion.div>

        <div className='grid md:grid-cols-2 gap-8 max-w-5xl mx-auto'>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}>

              <Link to='/seller/register'>
                <div className='group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden  border border-gray-100'>
                  <div className='p-8'>
                    <div className='w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300'>
                      <UserPlus className='w-7 h-7 text-white'/>
                    </div>

                    <h2 className='text-2xl font-bold text-gray-900 mb-3'>
                      Create New Account
                    </h2>

                    <p className='text-gray-600 mb-6'>
                      New to BazaarPH? Register your business and start selling today.
                      Complete our simple application process and get approved by our team.
                    </p>

                    <ul className='space-y-3 mb-8'>
                      <li className='flex items-start gap-3 text-gray-700'>
                        <CheckCircle className='w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5'/>
                        <span>Quick 5-step registration</span>
                      </li>
                      <li className='flex items-start gap-3 text-gray-700'>
                        <CheckCircle className='w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5'/>
                        <span>Admin approval in 1-3 business days</span>
                      </li>
                      <li className='flex items-start gap-3 text-gray-700'>
                        <CheckCircle className='w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5'/>
                        <span>Free to join and list products</span>
                      </li>
                    </ul>

                    <button className='w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-4 px-6 rounded-xl hover:to-orange-700 transition all duration-300 flex items-center justify-center gap-2 group shadow-lg shadow-orange-500/30'>
                      Get Started
                      <ArrowRight className='w-5 h-5 group-hover:translate-x-1 transition-transform'/>
                    </button>
                  </div>
                </div>
              </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20}}
            animate={{ opacity: 1, x: 0}}
            transition={{ duration: 0.6, delay: 0.3}}>

              <Link to='/seller/login'>
                <div className='group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100'>
                  <div className='p-8'>
                    <div className='w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300'>
                      <LogIn className='w-7 h-7 text-white'/>
                    </div>

                    <h2 className='text-2xl font-bold text-gray-900 mb-3'>
                      Sign In to Your Account 
                    </h2>

                    <p className='text-gray-600 mb-12'>
                      Already have a seller account? Sign in to access your dashboard,
                      manage products, and track your sales.
                    </p>

                    <ul className='space-y-3 mb-8'>
                      <li className='flex items-start gap-3 text-gray-700'>
                        <CheckCircle className='w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5'/>
                        <span>Access your seller dashboard</span>  
                      </li>
                      <li className='flex items-start gap-3 text-gray-700'>
                        <CheckCircle className='w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5'/>
                        <span>Manage products and orders</span>
                      </li>
                      <li className='flex items-start gap-3 text-gray-700'>
                        <CheckCircle className='w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5'/>
                        <span>View analytics and reports</span>
                      </li>
                    </ul>
                    <button className='w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center justify-center gap-2 group shadow-lg shadow-blue-500/30'>
                      Sign In Now
                    </button>
                  </div>
                </div>
              </Link>
          </motion.div>
        </div>
      </main>
      </div>
  );
}
