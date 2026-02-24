/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Store, ArrowRight, AlertCircle, Check, Quote, CheckCircle2, Phone, MapPin, Briefcase } from 'lucide-react';
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
    { name: 'Nike', logo: '/nike.png', size: 'w-14 h-14', radius: 90, angle: 60 },
    { name: 'Adidas', logo: '/Adidas.png', size: 'w-14 h-14', radius: 90, angle: 250 },
    { name: 'Samsung', logo: '/Samsung.jpg', size: 'w-16 h-16', radius: 140, angle: 165 },
    { name: 'Apple', logo: '/Apple.png', size: 'w-16 h-16', radius: 140, angle: 335 },
    { name: 'Sony', logo: '/Sony.png', size: 'w-14 h-14', radius: 190, angle: 280 },
    { name: 'Uniqlo', logo: '/Uniqlo.png', size: 'w-14 h-14', radius: 185, angle: 90 },
    { name: 'Puma', logo: '/Puma.jpg', size: 'w-14 h-14', radius: 190, angle: 215 },
    { name: 'LG', logo: '/LG.jpg', size: 'w-14 h-14', radius: 188, angle: 375 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate loading for effect
      const success = await login(email, password);
      if (success) {
        const currentSeller = useAuthStore.getState().seller;
        const hasSellerAccess =
          Boolean(currentSeller?.isVerified) ||
          currentSeller?.approvalStatus === 'verified' ||
          currentSeller?.approvalStatus === 'approved';

        navigate(hasSellerAccess ? '/seller' : '/seller/unverified');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-8 font-sans bg-[var(--brand-wash)] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vh] h-[50vh] bg-[var(--brand-primary)]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vh] h-[50vh] bg-[var(--brand-accent)]/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[1100px] bg-white rounded-[32px] shadow-2xl shadow-orange-900/5 overflow-hidden grid lg:grid-cols-2 min-h-[700px] border border-white/50 relative z-10"
      >
        {/* LEFT SIDE: LOGIN FORM */}
        <div className="p-8 lg:p-16 flex flex-col justify-center bg-white relative">
          <div className="max-w-[400px] mx-auto w-full">
            <div className="mb-10 text-center lg:text-left">
              <Link to="/" className="inline-block relative group">
                <div className="w-16 h-16 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20 transition-transform group-hover:scale-105 group-active:scale-95">
                  <img src='/BazaarX.png' alt='BazaarX Logo' className='w-10 h-10 object-contain brightness-0 invert' />
                </div>
              </Link>
              <h1 className="text-4xl font-extrabold text-[var(--text-headline)] font-heading tracking-tight mb-3">Welcome Back</h1>
              <p className="text-base text-[var(--text-secondary)] font-medium leading-relaxed">Sign in to manage your <span className="font-bold text-[var(--brand-primary)]">BazaarX Store</span>.</p>
            </div>

            {/* Quick Access Card */}
            <div className="mb-8 p-5 bg-orange-50/50 border border-orange-100 rounded-2xl transition-all hover:bg-orange-50 hover:border-orange-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[10px] font-black text-[var(--brand-primary)] uppercase tracking-widest mb-1">Testing Mode</p>
                  <p className="text-xs font-medium text-gray-500">Quick-fill demo accounts</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setEmail('seller1@bazaarph.com'); setPassword('Test@123456'); }}
                  className="text-[10px] font-bold text-[var(--brand-primary)] border border-orange-200 bg-white px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-all active:scale-95 shadow-sm"
                >
                  Auto-Fill
                </button>
              </div>
              <div className="space-y-2 text-xs text-[var(--text-secondary)] opacity-80 mt-3 border-t border-orange-200/50 pt-3">
                <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] inline-block"></span><span>Password: <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-orange-100">Test@123456</span></span></span>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm border border-red-100 animate-in slide-in-from-top-2">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-headline)] ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-[var(--brand-primary)] transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl focus:ring-0 focus:border-[var(--brand-primary)] outline-none transition-all text-sm font-medium text-gray-900 placeholder:text-gray-400 hover:border-gray-300"
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-headline)] ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-[var(--brand-primary)] transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-white border border-gray-200 rounded-xl focus:ring-0 focus:border-[var(--brand-primary)] outline-none transition-all text-sm font-medium text-gray-900 placeholder:text-gray-400 hover:border-gray-300"
                    placeholder="Enter your password"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input type="checkbox" className="peer sr-only" />
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:bg-[var(--brand-primary)] peer-checked:border-[var(--brand-primary)] transition-all"></div>
                    <Check size={14} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                  </div>
                  <span className="text-sm font-medium text-gray-500 group-hover:text-gray-700 transition-colors">Remember me</span>
                </label>
                <Link to="/forgot" className="text-sm font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)] transition-colors hover:underline">Forgot Password?</Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] hover:from-[var(--brand-primary)]/90 hover:to-[var(--brand-primary-dark)]/90 text-white h-14 rounded-xl text-lg font-bold shadow-xl shadow-orange-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 mt-4"
              >
                {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Sign In <ArrowRight size={20} /></>}
              </Button>
            </form>

            <p className="mt-8 text-center text-gray-500 text-sm font-medium">
              New to BazaarX? <Link to="/seller/register" className="text-[var(--brand-primary)] font-bold hover:text-[var(--brand-primary-dark)] transition-colors hover:underline">Create an account</Link>
            </p>
          </div>
        </div>

        {/* RIGHT SIDE: BRAND ORBIT */}
        <div className="hidden lg:flex flex-1 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] relative items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>

          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-12 text-center">
            <h2 className="text-5xl font-black text-white font-heading mb-4 tracking-tight drop-shadow-sm relative z-20">The Global System</h2>
            <p className="text-white max-w-md mx-auto text-lg font-medium leading-relaxed mb-12 relative z-20">
              Join the ecosystem where sellers meet global standards.
            </p>

            <div className="relative w-[450px] h-[450px] flex items-center justify-center">
              <div className='absolute w-[200px] h-[200px] border-2 border-dashed border-white/30 rounded-full animate-[spin_60s_linear_infinite]'></div>
              <div className="absolute w-[360px] h-[360px] border-2 border-white/20 rounded-full animate-[spin_80s_linear_infinite_reverse]"></div>

              <div className="z-30 w-24 h-24 bg-white rounded-full shadow-[0_0_50px_rgba(255,255,255,0.3)] flex items-center justify-center relative ring-8 ring-white/20">
                <img src="/BazaarX.png" alt="BazaarPH" className="w-14 h-14 object-contain" />
              </div>

              {/* Planets Logic */}
              <div className='absolute inset-0 w-full h-full animate-[spin_60s_linear_infinite]'>
                {verifiedBrands.filter((_, i) => i % 2 === 0).map((brand) => (
                  <div
                    key={brand.name}
                    className="absolute top-1/2 left-1/2 rounded-full bg-white shadow-lg border border-white/20 flex items-center justify-center p-2"
                    style={{
                      width: brand.size.split(' ')[0] === 'w-16' ? '60px' : '50px',
                      height: brand.size.split(' ')[0] === 'w-16' ? '60px' : '50px',
                      transform: `rotate(${brand.angle}deg) translate(${brand.radius}px) rotate(-${brand.angle}deg) translate(-50%, -50%)`,
                    }}
                  >
                    <img src={brand.logo} alt={brand.name} className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>

              <div className='absolute inset-0 w-full h-full animate-[spin_80s_linear_infinite_reverse]'>
                {verifiedBrands.filter((_, i) => i % 2 !== 0).map((brand) => (
                  <div
                    key={brand.name}
                    className="absolute top-1/2 left-1/2 rounded-full bg-white shadow-lg border border-white/20 flex items-center justify-center p-2"
                    style={{
                      width: brand.size.split(' ')[0] === 'w-16' ? '60px' : '50px',
                      height: brand.size.split(' ')[0] === 'w-16' ? '60px' : '50px',
                      transform: `rotate(${brand.angle}deg) translate(${brand.radius}px) rotate(-${brand.angle}deg) translate(-50%, -50%)`,
                    }}
                  >
                    <img src={brand.logo} alt={brand.name} className="w-full h-full object-contain" />
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
      await new Promise(resolve => setTimeout(resolve, 1000));
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
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-8 font-sans bg-[var(--brand-wash)] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60vh] h-[60vh] bg-[var(--brand-primary)]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60vh] h-[60vh] bg-[var(--brand-accent)]/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[1200px] bg-white rounded-[40px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] overflow-hidden grid lg:grid-cols-2 min-h-[750px] border border-white/60 relative z-10"
      >
        {/* Left Side - Testimonial/Brand */}
        <div className='hidden lg:flex flex-col justify-center p-16 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] relative overflow-hidden'>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>

          <div className='relative z-10 max-w-lg'>
            <div className='space-y-10'>
              <Quote className='text-white w-16 h-16 opacity-40 mb-[-2rem]' />
              <h2 className='text-4xl lg:text-5xl font-serif italic leading-[1.15] text-white drop-shadow-md'>
                "BazaarX bridged the gap between my local craft and the global market. The growth has been phenomenal."
              </h2>
              <div className='flex items-center gap-5 pt-4'>
                <div>
                  <p className='font-bold text-white text-xl'>Juan Dela Cruz</p>
                  <p className='text-white/80 font-medium'>Premier Online Seller</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className='p-8 lg:p-16 flex flex-col justify-center bg-white/80 backdrop-blur-sm relative'>
          <div className='max-w-[480px] mx-auto w-full relative z-10'>
            <div className='mb-8 text-center'>
              <div className='w-16 h-16 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-orange-500/20 mx-auto'>
                <img src='/BazaarX.png' className='h-9 w-9 object-contain brightness-0 invert'></img>
              </div>
              <h1 className='text-3xl font-black text-[var(--text-headline)] font-heading tracking-tight mb-2'>Join BazaarX</h1>
              <p className='text-base text-[var(--text-secondary)] font-medium'>Create your seller account to get started.</p>
            </div>

            {/* Stepper */}
            <div className='flex items-center justify-center gap-4 mb-10'>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-md ${step >= 1 ? 'bg-[var(--brand-primary)] text-white shadow-orange-500/20' : 'bg-white text-gray-400 border border-gray-100'}`}>
                {step > 1 ? <Check size={18} /> : "1"}
              </div>
              <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                <motion.div initial={{ width: "0%" }} animate={{ width: step === 2 ? "100%" : "0%" }} className="h-full bg-[var(--brand-primary)]" />
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-md ${step === 2 ? 'bg-[var(--brand-primary)] text-white shadow-orange-500/20' : 'bg-white text-gray-400 border border-gray-100'}`}>
                2
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm border border-red-100 animate-in slide-in-from-top-2">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <form className='space-y-6' onSubmit={handleSubmit}>
              <AnimatePresence mode='wait'>
                {step === 1 ? (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    <div className='space-y-2'>
                      <label className="text-sm font-bold text-[var(--text-headline)] ml-1">Email Address</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-[var(--brand-primary)] transition-colors" />
                        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="name@example.com" className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl focus:ring-0 focus:border-[var(--brand-primary)] outline-none transition-all text-sm font-medium" required />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[var(--text-headline)] ml-1">Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-[var(--brand-primary)] transition-colors" />
                        <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="Create a strong password" className="w-full pl-12 pr-12 py-4 bg-white border border-gray-200 rounded-xl focus:ring-0 focus:border-[var(--brand-primary)] outline-none transition-all text-sm font-medium" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[var(--text-headline)] ml-1">Confirm Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-[var(--brand-primary)] transition-colors" />
                        <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm your password" className="w-full pl-12 pr-12 py-4 bg-white border border-gray-200 rounded-xl focus:ring-0 focus:border-[var(--brand-primary)] outline-none transition-all text-sm font-medium" required />
                      </div>
                    </div>

                    <button type="button" onClick={handleNext} className="w-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] hover:from-[var(--brand-primary)]/90 hover:to-[var(--brand-primary-dark)]/90 text-white h-14 rounded-xl text-lg font-bold shadow-xl shadow-orange-500/20 mt-4 flex items-center justify-center gap-2 transition-all hover:translate-x-1">
                      <span>Next Step</span> <ArrowRight size={20} />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[var(--text-headline)] ml-1">Store Name</label>
                      <div className="relative group">
                        <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-[var(--brand-primary)] transition-colors" />
                        <input type="text" name="storeName" value={formData.storeName} onChange={handleChange} className="w-full pl-12 px-5 py-4 bg-white border border-gray-200 rounded-xl focus:ring-0 focus:border-[var(--brand-primary)] outline-none transition-all text-sm font-medium" placeholder="E.g., Juan's Crafts" required />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[var(--text-headline)] ml-1">Description</label>
                      <div className="relative group">
                        <Briefcase className="absolute left-4 top-4 text-gray-400 w-5 h-5 group-focus-within:text-[var(--brand-primary)] transition-colors" />
                        <textarea name="storeDescription" value={formData.storeDescription} onChange={handleChange} rows={3} className="w-full pl-12 px-5 py-3 bg-white border border-gray-200 rounded-xl focus:ring-0 focus:border-[var(--brand-primary)] outline-none transition-all text-sm font-medium resize-none shadow-sm" placeholder="Tell us about your products..." />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[var(--text-headline)] ml-1">Phone Number</label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-[var(--brand-primary)] transition-colors" />
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full pl-12 px-5 py-4 bg-white border border-gray-200 rounded-xl focus:ring-0 focus:border-[var(--brand-primary)] outline-none transition-all text-sm font-medium" placeholder="+63 912 345 6789" />
                      </div>
                    </div>

                    <div className="flex gap-4 mt-6">
                      <button type="button" onClick={() => setStep(1)} className="flex-1 h-12 rounded-xl font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors text-sm border border-transparent hover:border-gray-200">Back</button>
                      <button type="submit" disabled={isLoading} className="flex-[2] bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] hover:from-[var(--brand-primary)]/90 hover:to-[var(--brand-primary-dark)]/90 text-white h-12 rounded-xl font-bold shadow-xl shadow-orange-500/20 text-md transition-all active:scale-95 flex items-center justify-center">
                        {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Complete Setup"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            <div className='mt-10 text-center border-t border-gray-100 pt-6'>
              <p className='text-gray-500 font-medium text-sm'>
                Already have an account? <Link to="/seller/login" className="text-[var(--brand-primary)] font-bold hover:underline transition-all">Sign in here</Link>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
