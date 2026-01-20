/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Store, ArrowRight, Check } from 'lucide-react';
import { useAuthStore } from '@/stores/sellerStore';
import { Button } from '@/components/ui/button';


export function SellerLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuthStore();
  const navigate = useNavigate();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');


    try {
      const success = await login(email, password);
      if (success) {
        navigate('/seller');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleDemoLogin = async () => {
    setEmail('seller@bazaarph.com');
    setPassword('password');
    setError('');
   
    setTimeout(async () => {
      setIsLoading(true);
      try {
        const success = await login('seller@bazaarph.com', 'password');
        if (success) {
          navigate('/seller');
        }
      } catch (err) {
        setError('Demo login failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <div className="text-center mb-8">
            <div className="h-16 w-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Store className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">BazaarPH Seller</h1>
            <p className="text-gray-600 mt-1">Sign in to your seller account</p>
          </div>


          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-orange-50 to-orange-100/50 border border-orange-200 rounded-xl p-4 mb-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 mb-1.5 flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  Demo Seller Account
                </h3>
                <div className="space-y-1 text-sm text-orange-700">
                  <p className="font-mono">seller@bazaarph.com</p>
                  <p className="font-mono">password</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={handleDemoLogin}
                disabled={isLoading}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Try Demo'
                )}
              </Button>
            </div>
          </motion.div>


          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6"
            >
              {error}
            </motion.div>
          )}


          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>


            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>


            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </form>


          <div className="text-center mt-6 pt-6 border-t border-gray-200">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/seller/register" className="text-orange-600 font-medium hover:text-orange-700">
                Register as seller
              </Link>
            </p>
          </div>


          <div className="text-center mt-4">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
              ← Back to BazaarPH
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


export function SellerRegister() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    storeName: '',
    storeDescription: '',
    phone: '',
    storeAddress: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
 
  const { register } = useAuthStore();
  const navigate = useNavigate();


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };


  const handleNext = () => {
    if (step === 1) {
      if (!formData.email || !formData.password || !formData.confirmPassword) {
        setError('Please fill in all fields');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      setError('');
      setStep(2);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.storeName) {
      setError('Store name is required');
      return;
    }


    setIsLoading(true);
    setError('');


    try {
      const success = await register(formData);
      if (success) {
        setIsLoading(false);
        navigate('/seller');
      } else {
        setError('Registration failed. Please try again.');
        setIsLoading(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className='bg-white rounded-2xl shadow-xl overflow-hidden'>
          {/* Header */}
          <div className='bg-gradient-to-r from-orange-500 to-orange-600 p-8 text-center'>
            <div className='inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg mb-4 transform hover:scale-105 transition-transform duration-300'>
              <Store className='w-10 h-10 text-orange-500'/>
            </div>
            <h1 className='text-3xl font-bold text-white mb-2'>Join BazaarPH</h1>
            <p className='text-orange-100 text-sm'>Create your seller account</p>
          </div>


          {/* Progress Steps */}
          <div className='px-8 pt-6 pb-4'>
            <div className='flex items-center justify-center gap-2'>
              <div className='flex items-center'>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  step >= 1 ? 'bg-orange-500 text-white shadow-lg' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > 1 ? <Check className='w-5 h-5'/> : '1'}
                </div>
              </div>
              <div className={`h-1 w-16 rounded-full transition-all duration-300 ${
                step >= 2 ? 'bg-orange-500' : 'bg-gray-200'
              }`}></div>
              <div className='flex items-center'>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  step >= 2 ? 'bg-orange-500 text-white shadow-lg' : 'bg-gray-200 text-gray-500'
                }`}>
                  2
                </div>
              </div>
            </div>
          </div>


          {/* Error Message */}
          {error && (
            <div className='px-8'>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4"
              >
                {error}
              </motion.div>
            </div>
          )}


          {/* Form */}
          <div className='p-8 pt-4'>
            <form onSubmit={step === 1 ? (e) => { e.preventDefault(); handleNext(); } : handleSubmit} className='space-y-5'>
              {step === 1 ? (
                <>
                  {/* Email Field */}
                  <div>
                    <label htmlFor='email' className='block text-sm font-semibold text-gray-700 mb-2'>
                      Email Address
                    </label>
                    <div className='relative'>
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                          error
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                            : 'border-gray-200 focus:border-orange-500 focus:ring-orange-200'
                        }`}
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>
                 
                  {/* Password Field */}
                  <div>
                    <label htmlFor='password' className='block text-sm font-semibold text-gray-700 mb-2'>
                      Password
                    </label>
                    <div className='relative'>
                      <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                        <Lock className='h-5 w-5 text-gray-400'/>
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleChange}
                        className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                          error
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                            : 'border-gray-200 focus:border-orange-500 focus:ring-orange-200'
                        }`}
                        placeholder="Create a password"
                      />
                      <button
                        type='button'
                        onClick={() => setShowPassword(!showPassword)}
                        className='absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors'
                      >
                        {showPassword ? <EyeOff className='h-5 w-5'/> : <Eye className='h-5 w-5'/>}
                      </button>
                    </div>
                  </div>


                  {/* Confirm Password Field */}
                  <div>
                    <label htmlFor='confirmPassword' className='block text-sm font-semibold text-gray-700 mb-2'>
                      Confirm Password
                    </label>
                    <div className='relative'>
                      <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                        <Lock className='h-5 w-5 text-gray-400'/>
                      </div>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                          error
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                            : 'border-gray-200 focus:border-orange-500 focus:ring-orange-200'
                        }`}
                        placeholder="Confirm your password"
                      />
                      <button
                        type='button'
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className='absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors'
                      >
                        {showConfirmPassword ? <EyeOff className='h-5 w-5'/> : <Eye className='h-5 w-5'/>}
                      </button>
                    </div>
                  </div>  
                   
                  {/* Next Button */}
                  <button
                    type='submit'
                    className='w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3.5 px-6 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-200 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                  >
                    Next: Store Info
                    <ArrowRight className='w-5 h-5'/>
                  </button>
                </>
              ) : (
                <>
                  {/* Store Name */}
                  <div>
                    <label htmlFor='storeName' className='block text-sm font-semibold text-gray-700 mb-2'>
                      Store Name *
                    </label>
                    <input
                      id="storeName"
                      name="storeName"
                      type="text"
                      value={formData.storeName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all duration-200"
                      placeholder="Enter your store name"
                      required
                    />
                  </div>


                  {/* Store Description */}
                  <div>
                    <label htmlFor='storeDescription' className='block text-sm font-semibold text-gray-700 mb-2'>
                      Store Description
                    </label>
                    <textarea
                      id="storeDescription"
                      name="storeDescription"
                      value={formData.storeDescription}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all duration-200 resize-none"
                      placeholder="Describe your store and products"
                    />
                  </div>


                  {/* Phone */}
                  <div>
                    <label htmlFor='phone' className='block text-sm font-semibold text-gray-700 mb-2'>
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all duration-200"
                      placeholder="+63 912 345 6789"
                    />
                  </div>


                  {/* Address */}
                  <div>
                    <label htmlFor='storeAddress' className='block text-sm font-semibold text-gray-700 mb-2'>
                      Store Address
                    </label>
                    <input
                      id="storeAddress"
                      name="storeAddress"
                      type="text"
                      value={formData.storeAddress}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-all duration-200"
                      placeholder="City, Province"
                    />
                  </div>


                  {/* Action Buttons */}
                  <div className='flex gap-3 pt-2'>
                    <button
                      type='button'
                      onClick={() => setStep(1)}
                      className='flex-1 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl font-semibold transition-colors'
                    >
                      Back
                    </button>
                    <button
                      type='submit'
                      disabled={isLoading}
                      className='flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200'
                    >
                      {isLoading ? (
                        <div className='w-5 h-5 mx-auto border-2 border-white border-t-transparent rounded-full animate-spin'/>
                      ) : (
                        'Create Account'
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>


                {/* Login Link */}
            <div className='text-center mt-6'>
              <p className='text-sm text-gray-600'>
                Already have an account?{' '}
                <Link to='/seller/login' className='text-orange-500 hover:text-orange-600 font-semibold transition-colors'>
                  Sign in here
                </Link>
              </p>
            </div>
           
            {/* Back to Shop */}
            <div className='text-center mt-4'>
              <Link to='/' className='text-sm text-gray-500 hover:text-gray-700 transition-colors'>
                ← Back to BazaarPH
              </Link>
            </div>
          </div>
        </div>


       
      </div>
    </div>
  );
}
