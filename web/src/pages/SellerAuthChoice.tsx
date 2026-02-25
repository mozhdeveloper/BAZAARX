import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogIn, UserPlus } from 'lucide-react';
import {
  readRoleSwitchContext,
  type RoleSwitchContext,
} from '@/services/roleSwitchContext';

export function SellerAuthChoice() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as { roleSwitchContext?: RoleSwitchContext } | null;
  const stateContext = state?.roleSwitchContext;
  const storedContext = readRoleSwitchContext('seller');
  const switchContext =
    stateContext && stateContext.targetMode === 'seller'
      ? stateContext
      : storedContext;

  useEffect(() => {
    if (!switchContext || switchContext.targetMode !== 'seller') return;
    navigate('/seller/register', {
      replace: true,
      state: { roleSwitchContext: switchContext },
    });
  }, [switchContext, navigate]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      {/* Left Side */}
      <div className='w-full md:w-1/2 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] flex items-center justify-center p-8 md:p-12 relative overflow-hidden'>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className='max-w-xl space-y-8 relative z-10'>
          <div className='flex items-center space-x-3'>
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg border border-white/20">
              <img
                src='/BazaarX.png'
                alt='BazaarX Logo'
                className='w-8 h-8 object-contain brightness-0 invert'
              />
            </div>
            <span className='text-2xl font-black text-white font-heading tracking-tight'>BazaarX</span>
          </div>

          <blockquote className="space-y-6">
            <p className="text-3xl md:text-4xl lg:text-5xl font-serif italic text-white leading-tight drop-shadow-sm">
              "BazaarX has transformed how I manage my online store. My customers love the easy checkout system!"
            </p>
            <footer className="text-orange-100 text-lg font-medium flex items-center gap-2">
              <span className="w-8 h-[1px] bg-orange-200/50"></span>
              Juan Dela Cruz, Online Seller
            </footer>
          </blockquote>
        </div>
      </div>

      <div className='w-full md:w-1/2 bg-white flex items-center justify-center p-8 md:p-12 relative'>
        <Link to='/' className='absolute top-8 right-8 flex items-center text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-colors font-medium text-sm group'>
          <ArrowLeft className='w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform' />
          <span>Home</span>
        </Link>

        <div className='max-w-sm w-full space-y-8'>
          <div className='text-center space-y-3'>
            <h1 className='text-4xl font-black text-[var(--text-headline)] font-heading tracking-tight'>Welcome to BazaarX</h1>
            <p className='text-[var(--text-secondary)] font-medium text-lg'>Choose how you'd like to continue</p>
          </div>

          <div className='space-y-4'>

            {/* Create Seller Account */}
            <button
              onClick={() => {
                if (switchContext) {
                  navigate('/seller/register', {
                    state: { roleSwitchContext: switchContext },
                  });
                } else {
                  navigate('/seller/register');
                }
              }}
              className='w-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white rounded-[24px] p-1 transition-all duration-200 shadow-xl shadow-orange-500/20 hover:shadow-orange-500/30 active:scale-[0.98] group relative overflow-hidden'>
              <div className="bg-white/10 backdrop-blur-sm absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative px-6 py-5 flex items-center justify-between">
                <div className='text-left'>
                  <span className='block text-lg font-bold font-heading mb-0.5'>Create Seller Account</span>
                  <span className='block text-orange-100 text-sm font-medium opacity-90'>Start selling & grow business</span>
                </div>
                <div className='w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors'>
                  <UserPlus className='w-6 h-6 text-white' />
                </div>
              </div>
            </button>

            {/* Sign In */}
            <button
              onClick={() => {
                if (switchContext?.email) {
                  navigate('/seller/login', {
                    state: { prefillEmail: switchContext.email },
                  });
                } else {
                  navigate('/seller/login');
                }
              }}
              className='w-full bg-white text-[var(--text-headline)] border-2 border-gray-100 hover:border-orange-100 hover:bg-orange-50/30 rounded-[24px] p-6 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] group flex items-center justify-between'>
              <div className='text-left'>
                <span className='block text-lg font-bold font-heading mb-0.5 group-hover:text-[var(--brand-primary)] transition-colors'>Sign in into account</span>
                <span className='block text-[var(--text-secondary)] text-sm font-medium'>Manage your store & listings</span>
              </div>
              <div className='w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all'>
                <LogIn className='w-6 h-6 text-gray-400 group-hover:text-[var(--brand-primary)] transition-colors' />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
