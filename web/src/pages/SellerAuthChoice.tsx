import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogIn, UserPlus } from 'lucide-react';

export function SellerAuthChoice() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex">
      {/* Left Side */}
      <div className='w-1/2 bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 flex items-center justify-center p-12'>
        <div className='max-w-xl space-y-8'>
          <div className='flex items-center space-x-2'>
            <img
              src='/BazaarX.png'
              alt='BazaarX Logo'
              className='w-12 h-12 rounded-xl object-contain'
            />
            <span className='text-xl font-semibold text-[var(--text-primary)] font-heading'>BazaarX</span>
          </div>

          <blockquote className="space-y-6">
            <p className="text-4xl lg:text-5xl font-serif italic text-[var(--text-primary)] leading-tight">
              "BazaarX has transformed how I manage my online store. My customers love the easy checkout system!"
            </p>
            <footer className="text-[var(--text-secondary)] text-lg">
              - Juan Dela Cruz, Online Seller
            </footer>
          </blockquote>
        </div>
      </div>

      <div className='w-1/2 bg-white flex items-center justify-center p-12 relative'>
        <Link to='/' className='absolute top-8 right-8 flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors'>
          <ArrowLeft className='w-4 h-4 mr-1'/>
          <span>Home</span>
        </Link>

        <div className='max-w-sm w-full space-y-8'>
          <div className='text-center space-y-3'>
            <h1 className='text-3xl font-bold text-[var(--text-primary)] font-heading'>Welcome to BazaarX</h1>
            <p className='text-[var(--text-secondary)] font-sans'>Choose how you'd like to continue</p>
          </div>

          <div className='space-y-4'>

            {/* Create Seller Account */}
            <button 
              onClick={() => navigate('/seller/register')}
              className='w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-[var(--radius-xl)] p-6 transition-all duration-200 shadow-[var(--shadow-medium)] hover:shadow-[var(--shadow-large)] active:scale-95 group'>
                <div className='flex items-center justify-center space-x-3 mb-2'>
                  <div className='bg-white bg-opacity-20 p-2 rounded-lg'>
                    <UserPlus className='w-6 h-6'/>
                  </div>
                  <span className='text-xl font-semibold font-heading'>Create Seller Account</span>
                </div>
              <p className='text-white/90 text-sm font-sans'>Start selling and grow your business online</p>
            </button>

            {/* Sign In */}
            <button 
              onClick={() => navigate('/seller/login')}
              className='w-full bg-white hover:bg-gray-50 text-[var(--text-primary)] border-2 border-[var(--border)] hover:bg-gray-50 rounded-[var(--radius-xl)] p-6 transition-all duration-200 shadow-[var(--shadow-small)] hover:shadow-[var(--shadow-medium)] active:scale-95 group'>
                <div className='flex items-center justify-center space-x-3 mb-2'>
                  <div className='bg-[var(--primary)]/10 p-2 rounded-lg'>
                    <LogIn className='w-6 h-6 text-[var(--brand-primary)]'/>
                  </div>
                    <span className='text-xl font-semibold font-heading'>Sign in to your account</span>
                </div>
              <p className='text-[var(--text-secondary)] text-sm font-sans'>Access your store and manage your listings</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
