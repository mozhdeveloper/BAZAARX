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
    { name: 'Nike', logo: '/nike.png', size: 'w-16 h-16', radius: 80, angle: 60 },
    { name: 'Adidas', logo: '/Adidas.png', size: 'w-16 h-16', radius: 80, angle: 250 },
    { name: 'Samsung', logo: '/Samsung.jpg', size: 'w-16 h-16', radius: 125, angle: 165 },
    { name: 'Apple', logo: '/Apple.png', size: 'w-16 h-16', radius: 125, angle: 335 },
    { name: 'Sony', logo: '/Sony.png', size: 'w-16 h-16', radius: 180, angle: 280 },
    { name: 'Uniqlo', logo: '/Uniqlo.png', size: 'w-16 h-16', radius: 175, angle: 90 },
    { name: 'Puma', logo: '/Puma.jpg', size: 'w-16 h-16', radius: 180, angle: 215 },
    { name: 'LG', logo: '/LG.jpg', size: 'w-16 h-16', radius: 178, angle: 375 },
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
    setEmail('active.sports@bazaarph.com');
    setPassword('Seller123!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-8 font-sans bg-gradient-to-br from-white via-orange-50/30 to-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-5xl bg-white rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.07)] overflow-hidden grid lg:grid-cols-2 min-h-[700px] border border-gray-100"
      >

        {/* LEFT SIDE: LOGIN FORM */}
        <div className="p-6 lg:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-6">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow">
                <img
                  src='/BazaarX.png'
                  className='w-12 h-12 rounded-xl object-contain' />
              </div>
              <h1 className="text-3xl font-extrabold text-[#0F172A] font-heading tracking-tight mb-1">Welcome Back</h1>
              <p className="text-md text-[#6B7280] font-sans font-medium">Sign in to manage your BazaarX Store.</p>
            </div>

            {/* Quick Access Card */}
            <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10 rounded-2xl">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.1em] mb-0.5">🧪 Test Seller Accounts</p>
                  <p className="text-xs text-[#6B7280]">All have products & orders</p>
                </div>
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="text-[10px] font-bold text-primary border border-primary/20 px-3 py-1.5 rounded-xl bg-white hover:bg-primary/10 transition-all active:scale-95 shadow-sm"
                >
                  Auto-Fill ActiveGear
                </button>
              </div>
              <div className="space-y-1 text-xs text-primary/90">
                <p className="font-semibold">Password for all: <span className="font-mono bg-primary/10 px-2 py-0.5 rounded">Seller123!</span></p>
                <div className="grid grid-cols-1 gap-1 mt-2 text-[11px]">
                  <button type="button" onClick={() => { setEmail('active.sports@bazaarph.com'); setPassword('Seller123!'); }} className="text-left hover:text-primary hover:underline transition-colors">• active.sports@bazaarph.com <span className="text-gray-500">(ActiveGear Sports)</span></button>
                  <button type="button" onClick={() => { setEmail('maria.santos@bazaarph.com'); setPassword('Seller123!'); }} className="text-left hover:text-primary hover:underline transition-colors">• maria.santos@bazaarph.com <span className="text-gray-500">(Maria's Fashion House)</span></button>
                  <button type="button" onClick={() => { setEmail('juan.tech@bazaarph.com'); setPassword('Seller123!'); }} className="text-left hover:text-primary hover:underline transition-colors">• juan.tech@bazaarph.com <span className="text-gray-500">(TechStore Official)</span></button>
                  <button type="button" onClick={() => { setEmail('wellness.haven@bazaarph.com'); setPassword('Seller123!'); }} className="text-left hover:text-primary hover:underline transition-colors">• wellness.haven@bazaarph.com <span className="text-gray-500">(Wellness Haven)</span></button>
                  <button type="button" onClick={() => { setEmail('home.essentials@bazaarph.com'); setPassword('Seller123!'); }} className="text-left hover:text-primary hover:underline transition-colors">• home.essentials@bazaarph.com <span className="text-gray-500">(Home Essentials Co.)</span></button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm border border-red-100 animate-shake">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#6B7280] ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-4 h-4" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary outline-none transition-all text-sm"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#6B7280] ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-4 h-4" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary outline-none transition-all text-sm"
                    placeholder="••••••••••••"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                  <span className="text-sm text-[#6B7280] group-hover:text-[#0F172A] transition-colors">Remember me</span>
                </label>
                <Link to="/forgot" className="text-sm font-bold text-primary hover:underline">Forgot Password?</Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary-dark text-white h-12 rounded-2xl text-base font-bold shadow-xl shadow-primary/10 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Sign In <ArrowRight size={18} /></>}
              </Button>
            </form>

            <p className="mt-8 text-center text-[#6B7280] text-md">
              New to BazaarX? <Link to="/seller/register" className="text-primary font-bold hover:underline ml-1">Create an account</Link>
            </p>
          </div>
        </div>

        {/* RIGHT SIDE: BRAND ORBIT */}
        <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/5 to-primary/10 relative items-center justify-center overflow-hidden border-l border-gray-100">
          <div className="absolute inset-0 opacity-40  [background-size:24px_24px]"></div>

          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-12">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-[#0F172A] font-heading mb-2 tracking-tight">The Global System</h2>
              <p className="text-[#6B7280] max-w-s mx-auto text-base">Sync your BazaarX store together with the world's most popular brands.</p>
            </div>

            <div className="relative w-[360px] h-[360px] flex items-center justify-center">

              <div className='absolute w-[160px] h-[160px] border-2 border-orange-200/50 rounded-full'></div>
              <div className="absolute w-[260px] h-[260px] border-2 border-orange-200/50 rounded-full"></div>
              <div className="absolute inset-0 border-2 border-orange-200/50 rounded-full"></div>
              {/* Central Logo */}
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="z-30 w-18 h-18 bg-white rounded-[45px] shadow-2xl flex items-center justify-center border-[4px] border-primary"
              >
                <img src="/Logo.png" alt="BazaarPH" className="w-16 h-16 rounded-[45px] object-contain" />
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
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-8 font-sans bg-gradient-to-br from-white via-orange-50/30 to-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-5xl bg-white rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.07)] overflow-hidden grid lg:grid-cols-2 min-h-[700px] border border-gray-100"
      >
        {/* Left Side */}
        <div className='hidden lg:flex flex-col justify-center p-12 bg-white relative overflow-hidden'>
          <div className='relative z-10 max-w-lg'>
            <div className='space-y-6'>
              <Quote className='text-primary w-10 h-14 -mb-6 -ml-3 opacity-20' />
              <h2 className='text-4xl font-serif italic leading-tight text-[#0F172A]'>
                "From local hobbyist to premier global seller—BazaarPH provided the bridge I needed to reach my customers, wherever they are."
              </h2>
              <div className='flex items-center gap-4'>
                <div className='w-12 h-12 bg-gray-100 rounded-full overflow-hidden border-2 border-primary/20 shadow-sm flex items-center justify-center'>
                  <span className='text-primary font-bold'>JC</span>
                </div>
                <div>
                  <p className='font-bold text-[#0F172A] text-lg'>Juan Dela Cruz</p>
                  <p className='text-primary font-medium text-sm'>Premier Online Seller</p>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        </div>

        {/* Right Side */}
        <div className='p-6 lg:p-12 flex flex-col justify-center bg-[#FFF9F1] relative border-l border-orange-100/50'>

          <div className='absolute top-0 right-0 w-full h-full opacity-40 pointer-events-none overflow-hidden'>
            <div className='absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]'></div>
          </div>

          <div className='max-w-md mx-auto w-full relative z-10'>
            <div className='mb-6 text-center'>
              <div className='w-14 h-14 bg-white rounded-2xl flex items-center mb-4 shadow-xl shadow-primary/10 mx-auto border border-primary/10'>
                <img
                  src='/BazaarX.png'
                  className='h-12 w-12 object-obtain'></img>
              </div>
              <h1 className='text-3xl font-black text-[#0F172A] font-heading tracking-tight mb-1'>Join BazaarPH</h1>
              <p className='text-md text-[#6B7280] font-sans font-medium'>Create your seller account to get started.</p>
            </div>

            {/* Progress */}
            <div className='flex items-center justify-center gap-3 mb-8'>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all shadow-md ${step >= 1 ? 'bg-primary text-white' : 'bg-white text-[#9CA3AF] border border-gray-100'}`}>
                {step > 1 ? <CheckCircle2 size={20} /> : "1"}
              </div>
              <div className="w-16 h-1 bg-primary/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: step === 2 ? "100%" : "0%" }}
                  className="h-full bg-primary"
                />
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all shadow-md ${step === 2 ? 'bg-primary text-white' : 'bg-white text-[#9CA3AF] border border-gray-100'}`}>
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
                      <div className='space-y-1.5'>
                        <label className="text-xs font-bold text-[#6B7280] ml-1">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-4 h-4" />
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                            className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:border-primary outline-none transition-all shadow-sm text-sm"
                            required
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#6B7280] ml-1">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-4 h-4" />
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Create a password"
                            className="w-full pl-11 pr-11 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:border-primary outline-none transition-all shadow-sm text-sm" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#6B7280] ml-1">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-4 h-4" />
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Confirm your password"
                            className="w-full pl-11 pr-11 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:border-primary outline-none transition-all shadow-sm text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                          >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Next Button */}
                      <button
                        type="button"
                        onClick={handleNext}
                        className="w-full bg-primary hover:bg-primary-dark text-white h-14 rounded-2xl 
                                  text-base font-bold shadow-xl shadow-primary/20 mt-2
                                  flex items-center justify-center gap-2
                                  transition-all"
                      >
                        <span>Next: Store Info</span>
                        <ArrowRight
                          size={18}
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
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#6B7280] ml-1">Store Name *</label>
                        <input
                          id="storeName"
                          name="storeName"
                          type="text"
                          value={formData.storeName}
                          onChange={handleChange}
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:border-primary outline-none transition-all shadow-sm text-sm"
                          placeholder="Enter your store name"
                          required
                        />
                      </div>

                      {/* Store Description */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#6B7280] ml-1">Store Description</label>
                        <textarea
                          id="storeDescription"
                          name="storeDescription"
                          value={formData.storeDescription}
                          onChange={handleChange}
                          rows={2}
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:border-primary outline-none transition-all shadow-sm text-sm"
                          placeholder="Describe your store and products"
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#6B7280] ml-1">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-4 h-4" />
                          <input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full pl-10 px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:border-primary outline-none transition-all shadow-sm text-sm"
                            placeholder='+63 912 345 6789'
                          />
                        </div>
                      </div>

                      {/* Address */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#6B7280] ml-1">Store Address</label>
                        <input
                          id="storeAddress"
                          name="storeAddress"
                          type="text"
                          value={formData.storeAddress}
                          onChange={handleChange}
                          className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:border-primary outline-none transition-all shadow-sm text-sm"
                          placeholder="City, Province"
                        />
                      </div>

                      <div className='flex gap-3 mt-4'>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="flex-1 h-12 rounded-2xl font-bold text-[#6B7280] hover:bg-gray-50 text-sm"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          className="flex-[2] bg-primary hover:bg-primary-dark text-white h-12 rounded-2xl font-bold shadow-lg shadow-primary/20 text-sm"
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
              <p className='text-[#6B7280] font-medium'>
                Already have an account? <Link to="/seller/login" className="text-primary font-bold hover:underline ml-1">Sign in</Link>
              </p>
              <Link to="/" className="inline-block mt-4 text-m font-semibold text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
                ← Back to BazaarPH
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
