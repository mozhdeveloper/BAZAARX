import { Link } from 'react-router-dom';
import { ArrowLeft, LogIn, UserPlus } from 'lucide-react';

export function SellerAuthChoice() {
  return (
    <div className="min-h-screen flex">
      {/* Left Side */}
      <div className='w-1/2 bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 flex items-center justify-center p-12'>
        <div className='max-w-xl space-y-8'>
          <div className='flex items-center space-x-2'>
            <img
              src='/Logo.png'
              alt='BazaarPH Logo'
              className='w-12 h-12 rounded-xl object-obtain'
            />
            <span className='text-xl font-semibold text-gray-900'>BazaarPH</span>
          </div>

          <blockquote className="space-y-6">
            <p className="text-4xl lg:text-5xl font-serif italic text-gray-900 leading-tight">
              "BazaarPH has transformed how I manage my online store. My customers love the easy checkout system!"
            </p>
            <footer className="text-gray-600 text-lg">
              - Juan Dela Cruz, Online Seller
            </footer>
          </blockquote>
        </div>
      </div>

      <div className='w-1/2 bg-white flex items-center justify-center p-12 relative'>
        <button className='absolute top-8 right-8 flex items-center text-gray-600 hover:text-gray-900 transition-colors'>
          
          <ArrowLeft className='w-4 h-4 mr-1'/>
          <Link to='/'>Home</Link>
        </button>

        <div className='max-w-sm w-full space-y-8'>
          <div className='text-center space-y-3'>
            <h1 className='text-3xl font-bold text-gray-900'>Welcome to BazaarPH</h1>
            <p className='text-gray-600'>Choose how you'd like to continue</p>
          </div>

          <div className='space-y-4'>

            {/* Create Seller Account */}
            <button className='w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl p-6 transition-all shadow-md hover:shadow-lg group'>
              <Link to='/seller/register'>
                <div className='flex items-center justify-center space-x-3 mb-2'>
                  <div className='bg-white bg-opacity-20 p-2 rounded-lg'>
                    <UserPlus className='w-6 h-6'/>
                  </div>
                  <span className='text-xl font-semibold'>Create Seller Account</span>
                </div>
              </Link>   
              <p className='text-orange-50 text-sm'>Start selling and grow your business online</p>
            </button>

            {/* Sign */}
            <button className='w-full bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200 rounded-xl p-6 transition-all shadow-sm hover:shadow-md group'>
              <Link to='/seller/login'>
                <div className='flex items-center justify-center space-x-3 mb-2'>
                  <div className='bg-orange-100 p-2 rounded-lg'>
                    <LogIn className='w-6 h-6 text-orange-600'/>
                  </div>
                    <span className='text-xl font-semibold'>Sign in to your account</span>
                </div>
              </Link>
              <p className='text-gray-600 text-sm'>Access your store and manage your listing</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
