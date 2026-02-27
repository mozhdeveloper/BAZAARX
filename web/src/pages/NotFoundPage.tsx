import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[var(--brand-wash)] overflow-hidden font-sans relative">
            {/* Background Decor */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-orange-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-yellow-100/50 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
                {/* Large 404 Background Text */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                        duration: 1.2,
                        delay: 0.2,
                        ease: [0, 0.71, 0.2, 1.01]
                    }}
                    className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none"
                >
                    <h1 className="text-[15rem] md:text-[25rem] font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-yellow-600 leading-none select-none opacity-[0.08]">
                        404
                    </h1>
                </motion.div>

                {/* Main Content (Text and Buttons) */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="relative z-10 text-center px-4"
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-headline)] mb-4 drop-shadow-sm">
                        Page Not Found!
                    </h2>
                    <p className="text-lg md:text-lg text-[var(--text-muted)] max-w-md mx-auto mb-10">
                        Looks like the page you're looking for no longer exists.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                        <button
                            onClick={() => navigate(-1)}
                            className="text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)] transition-all font-bold flex items-center gap-2 group"
                        >
                            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                            Go Back
                        </button>
                        <Button
                            onClick={() => navigate("/")}
                            className="w-full sm:w-auto px-8 h-12 rounded-xl bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-accent)] transition-all font-bold shadow-lg shadow-orange-200 flex items-center gap-2 group"
                        >
                            <Home className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            Return to Home
                        </Button>
                    </div>
                </motion.div>
            </div>

            {/* Dynamic floating circles for extra WOW */}
            <motion.div
                animate={{
                    y: [0, -20, 0],
                    rotate: [0, 10, 0]
                }}
                transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute top-1/2 left-[-10%] w-24 h-24 bg-orange-200/30 rounded-full blur-xl hidden md:block"
            />
            <motion.div
                animate={{
                    y: [0, 20, 0],
                    rotate: [0, -10, 0]
                }}
                transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute bottom-1/4 right-[-5%] w-32 h-32 bg-yellow-200/30 rounded-full blur-xl hidden md:block"
            />
        </div>
    );
}
