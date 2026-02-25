/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Store, ArrowRight, AlertCircle, Check, Quote, CheckCircle2, Phone } from 'lucide-react';
import { useAuthStore } from '@/stores/sellerStore';
import { Button } from '@/components/ui/button';

export function SellerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const verifiedBrands = [
    { name: 'Nike', logo: '/nike.png', size: 'w-14 h-14', radius: 100, angle: 100 }, 
    { name: 'Adidas', logo: '/Adidas.png', size: 'w-14 h-14', radius: 100, angle: 250 }, 
    { name: 'Samsung', logo: '/Samsung.jpg', size: 'w-16 h-16', radius: 160, angle: 155 }, 
    { name: 'Apple', logo: '/Apple.png', size: 'w-14 h-14', radius: 160, angle: 335 },
    { name: 'Sony', logo: '/Sony.png', size: 'w-16 h-16', radius: 230, angle: 280 }, 
    { name: 'Uniqlo', logo: '/Uniqlo.png', size: 'w-14 h-14', radius: 220, angle: 90 }, 
    { name: 'Puma', logo: '/Puma.jpg', size: 'w-16 h-16', radius: 230, angle: 215 }, 
    { name: 'LG', logo: '/LG.jpg', size: 'w-16 h-16', radius: 225, angle: 375 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const success = await login(email, password);
      if (success) navigate('/seller');
      else setError('Invalid email or password');
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail('seller@bazaarph.com');
    setPassword('password');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-8 font-sans bg-gradient-to-br from-white via-orange-50/30 to-white animate-gradient">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-6xl bg-white rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.07)] overflow-hidden grid lg:grid-cols-2 min-h-[800px] border border-gray-100"
      >
        
        {/* LEFT SIDE: LOGIN FORM */}
        <div className="p-8 lg:p-16 flex flex-col justify-center bg-white">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-10">
              <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-200">
                <img
                  src='/Logo.png'
                  className='w-14 h-14 rounded-xl object-contain'/>
              </div>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">Welcome Back</h1>
              <p className="text-gray-500 font-medium">Sign in to manage your BazaarX Store.</p>
            </div>

            {/* Quick Access Card */}
            <div className="mb-8 p-5 bg-orange-50 rounded-2xl border border-orange-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Quick Access</p>
                <p className="text-sm font-bold text-gray-700">Demo Seller Account</p>
              </div>
              <button 
                type="button"
                onClick={handleDemoLogin}
                className="bg-white hover:bg-orange-100 text-orange-600 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border border-orange-200"
              >
                Auto-Fill
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm border border-red-100 animate-shake">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:bg-white focus:border-orange-500 outline-none transition-all"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:bg-white focus:border-orange-500 outline-none transition-all"
                    placeholder="••••••••••••"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                  <span className="text-sm text-gray-500 group-hover:text-gray-800 transition-colors">Remember me</span>
                </label>
                <Link to="/forgot" className="text-sm font-bold text-orange-600 hover:underline">Forgot Password?</Link>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white h-14 rounded-2xl text-lg font-bold shadow-xl shadow-orange-100 transition-all flex items-center justify-center gap-2 mt-4"
              >
                {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Sign In <ArrowRight size={20}/></>}
              </Button>
            </form>

            <p className="mt-10 text-center text-gray-500 font-medium">
              New to BazaarX? <Link to="/seller/register" className="text-orange-600 font-bold hover:underline ml-1">Create an account</Link>
            </p>
          </div>
        </div>

        {/* RIGHT SIDE: BRAND ORBIT */}
        <div className="hidden lg:flex flex-1 bg-orange-50 relative items-center justify-center overflow-hidden border-l border-gray-100">
          <div className="absolute inset-0 opacity-40  [background-size:24px_24px]"></div>
          
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-12">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">The Global System</h2>
              <p className="text-gray-600 max-w-s mx-auto text-lg">Sync your BazaarX store together with the world's most popular brands.</p>
            </div>

            <div className="relative w-[450px] h-[450px] flex items-center justify-center">
              
              <div className='absolute w-[200px] h-[200px] border-2 border-orange-200/50 rounded-full'></div>
              <div className="absolute w-[315px] h-[315px] border-2 border-orange-200/50 rounded-full"></div>
              <div className="absolute inset-0 border-2 border-orange-200/50 rounded-full"></div>
              {/* Central Logo */}
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="z-30 w-22 h-22 bg-white rounded-[55px] shadow-2xl flex items-center justify-center border-[6px] border-orange-500"
              >
                <img src="/Logo.png" alt="BazaarPH" className="w-20 h-20 rounded-[55px] object-contain" />
              </motion.div>

              <div className='absolute inset-0 w-full h-full'>
                {verifiedBrands.map((brand, i) => (
                  <div 
                    key={brand.name}
                    className={`absolute top-1/2 left-1/2 rounded-full bg-white shadow-lg border border-orange-50 flex items-center justify-center p-3 hover:scale-110 transition-transform duration-300 z-20 ${brand.size}`}
                    style={{ 
                      // brand.radius matches half of the ring widths above
                      transform: `rotate(${brand.angle}deg) translate(${brand.radius}px) rotate(-${brand.angle}deg) translate(-50%, -50%)`,
                    }}
                    >
                    <img 
                      src={brand.logo} 
                      alt={brand.name} 
                      className="w-full h-full object-contain rounded-full transition-all" 
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  );
}

export function SellerRegister() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    storeName: "",
    storeDescription: "",
    phone: "",
    storeAddress: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  const { register } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.email || !formData.password || !formData.confirmPassword) {
        setError("Please fill in all fields");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      setError("");
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.storeName) {
      setError("Store name is required");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const success = await register(formData);
      if (success) {
        setIsLoading(false);
        navigate("/seller");
      } else {
        setError("Registration failed. Please try again.");
        setIsLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-8 font-sans bg-[#FDF8F3]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-7xl bg-white rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)] overflow-hidden grid lg:grid-cols-2 min-h-[800px] border border-gray-100"
      >
        {/* Left Side */}
        <div className='hidden lg:flex flex-col justify-center p-16 bg-white relative overflow-hidden'>
          <div className='relative z-10 max-w-lg'>
            <div className='space-y-8'>
              <Quote className='text-orange-500 w-12 h-16 -mb-8 -ml-4 opacity-20'/>
              <h2 className='text-5xl font-serif italic leading-tight text-gray-900'>
                "From local hobbyist to premier global seller—BazaarPH provided the bridge I needed to reach my customers, wherever they are."
              </h2>
              <div className='flex items-center gap-4'>
                <div className='w-14 h-14 bg-gray-100 rounded-full overflow-hidden border-2 border-orange-100 shadow-sm flex items-center justify-center'>
                  <span className='text-orange-500 font-bold'>JC</span>
                </div>
                <div>
                  <p className='font-bold text-gray-900 text-xl'>Juan Dela Cruz</p>
                  <p className='text-orange-600 font-medium'>Premier Online Seller</p>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        </div>
        
        {/* Right Side */}
        <div className='p-8 lg:p-16 flex flex-col justify-center bg-[#FFF9F1] relative border-l border-orange-100/50'>
        
          <div className='absolute top-0 right-0 w-full h-full opacity-40 pointer-events-none overflow-hidden'>
            <div className='absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-200 rounded-full blur-[120px]'></div>
          </div>

          <div className='max-w-md mx-auto w-full relative z-10'>
            <div className='mb-8 text-center'>
              <div className='w-16 h-16 bg-white rounded-2xl flex items-center mb-6 shadow-xl shadow-orange-200/50 mx-auto border border-orange-100'>
                <img 
                  src='/BazaarX.png'
                  className='h-14 w-14 object-obtain'></img>
              </div>
              <h1 className='text-4xl font-black text-gray-900 tracking-tight mb-2'>Join BazaarPH</h1>
              <p className='text-gray-600 font-medium'>Create your seller account to get started.</p>
            </div>
            
            {/* Progress */}
            <div className='flex items-center justify-center gap-3 mb-8'>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all shadow-md ${step >= 1 ? 'bg-orange-500 text-white' : 'bg-white text-gray-400 border border-gray-100'}`}>
                {step > 1 ? <CheckCircle2 size={20} /> : "1"}
              </div>
              <div className="w-16 h-1 bg-orange-200/30 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: step === 2 ? "100%" : "0%" }}
                  className="h-full bg-orange-500"
                />
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all shadow-md ${step === 2 ? 'bg-orange-500 text-white' : 'bg-white text-gray-400 border border-gray-100'}`}>
                2
              </div>
            </div>
            
            {/* Error */}
            {error && (
              <div className="px-8">
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
            <div>
              <form className='space-y-5' onSubmit={handleSubmit}>
                <AnimatePresence mode='wait'>
                  {step === 1 ? (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 10 }} 
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-5"
                    >
                      {/* Email */}
                      <div className='space-y-2'>
                        <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input 
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter your email" 
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:border-orange-500 outline-none transition-all shadow-sm" 
                            required
                            />
                        </div>
                      </div>

                      {/* Password */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input 
                            type={showPassword ? "text" : "password"} 
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Create a password" 
                            className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:border-orange-500 outline-none transition-all shadow-sm" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Confirm your password"
                            className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:border-orange-500 outline-none transition-all shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                          >
                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>

                      {/* Next Button */}
                      <button
                        type="button"
                        onClick={handleNext}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white h-14 rounded-2xl 
                                  text-lg font-bold shadow-xl shadow-orange-200 mt-4
                                  flex items-center justify-center gap-2
                                  transition-all"
                      >
                        <span>Next: Store Info</span>
                        <ArrowRight
                          size={20}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 10 }} 
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-5"
                    >
                      {/* Store Name */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Store Name *</label>
                        <input 
                          id="storeName"
                          name="storeName"
                          type="text"
                          value={formData.storeName}
                          onChange={handleChange}
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:border-orange-500 outline-none transition-all shadow-sm" 
                          placeholder="Enter your store name"
                          required
                        />
                      </div>

                      {/* Store Description */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Store Description</label>
                        <textarea 
                          id="storeDescription"
                          name="storeDescription"
                          value={formData.storeDescription}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:border-orange-500 outline-none transition-all shadow-sm" 
                          placeholder="Describe your store and products"
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input 
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleChange} 
                            className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:border-orange-500 outline-none transition-all shadow-sm" 
                            placeholder='+63 912 345 6789'
                          />
                        </div>
                      </div>

                      {/* Address */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Store Address</label>
                        <input 
                         id="storeAddress"
                          name="storeAddress"
                          type="text"
                          value={formData.storeAddress}
                          onChange={handleChange}
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:border-orange-500 outline-none transition-all shadow-sm" 
                          placeholder="City, Province"
                        />
                      </div>

                      <div className='flex gap-3 mt-4'>
                        <button 
                          type="button" 
                          onClick={() => setStep(1)} 
                          className="flex-1 h-14 rounded-2xl font-bold text-gray-500 hover:bg-gray-50"
                        >
                          Back
                        </button>
                        <button
                          type="submit" 
                          className="flex-[2] bg-orange-600 hover:bg-orange-700 text-white h-14 rounded-2xl font-bold shadow-lg shadow-orange-200"
                        >
                          Create Account
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </div>

            <div className='mt-8 text-center'>
              <p className='text-gray-500 font-medium'>
                Already have an account? <Link to="/seller/login" className="text-orange-600 font-bold hover:underline ml-1">Sign in</Link>
              </p>
              <Link to="/" className="inline-block mt-4 text-m font-semibold text-gray-400 hover:text-gray-600 transition-colors">
                ← Back to BazaarPH
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
