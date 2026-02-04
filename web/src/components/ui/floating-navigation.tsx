import React, { useState, useEffect } from "react";
import {
    ArrowUp,
    Menu,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface NavItem {
    id: string;
    label: string;
}

interface FloatingNavigationProps {
    navItems: NavItem[];
}

export const FloatingNavigation: React.FC<FloatingNavigationProps> = ({ navItems }) => {
    const [showButton, setShowButton] = useState(false);
    const [activeSection, setActiveSection] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);
    const [isHoveringBack, setIsHoveringBack] = useState(false);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
            setIsExpanded(false);
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            // Show back-to-top button if scrolled down
            setShowButton(window.scrollY > 300);

            // If at the top of the page, clear active section
            if (window.scrollY < 100) {
                setActiveSection("");
                return;
            }

            // Determine active section
            let currentSection = "";
            let minDistance = Infinity;

            navItems.forEach((item) => {
                const element = document.getElementById(item.id);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    const distance = Math.abs(rect.top);
                    if (distance < minDistance) {
                        minDistance = distance;
                        currentSection = item.id;
                    }
                }
            });
            setActiveSection(currentSection);
        };

        window.addEventListener("scroll", handleScroll);
        handleScroll();
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <>
            <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

            {/* Back to Top Button */}
            <AnimatePresence>
                {showButton && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={scrollToTop}
                        onMouseEnter={() => setIsHoveringBack(true)}
                        onMouseLeave={() => setIsHoveringBack(false)}
                        className="fixed bottom-6 right-6 z-50 p-3 bg-white/80 backdrop-blur-md text-[#ff6a00] rounded-full shadow-lg hover:bg-white/80 hover:text-orange-600 transition-all duration-300 flex items-center overflow-hidden"
                        aria-label="Back to top"
                    >
                        <ArrowUp className="w-6 h-6 flex-shrink-0" />
                        <AnimatePresence>
                            {isHoveringBack && (
                                <motion.span
                                    initial={{ width: 0, opacity: 0, paddingLeft: 0 }}
                                    animate={{ width: "auto", opacity: 1, paddingLeft: 8 }}
                                    exit={{ width: 0, opacity: 0, paddingLeft: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="whitespace-nowrap text-sm font-medium pr-1"
                                >
                                    Back to Top
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Expandable Navigation Menu - Bottom Left */}
            <div className="fixed bottom-6 left-6 z-50 flex items-center justify-start pointer-events-none">
                <motion.div
                    initial={{ width: "48px", height: "48px", borderRadius: "24px" }}
                    animate={{
                        width: isExpanded ? "auto" : "48px",
                        height: "48px",
                        borderRadius: "24px",
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    onHoverStart={() => setIsExpanded(true)}
                    onHoverEnd={() => setIsExpanded(false)}
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="bg-white/80 backdrop-blur-md shadow-2xl overflow-hidden pointer-events-auto cursor-pointer relative flex items-center pr-2"
                    style={{ maxWidth: "calc(100vw - 48px)" }}
                >

                    {/* Trigger Icon */}
                    <div className="flex-shrink-0 w-[48px] h-[48px] flex items-center justify-center z-20 bg-white/0">
                        <Menu className="w-6 h-6 text-[#ff6a00]" />
                    </div>

                    {/* Horizontal Scrollable List - Hidden Scrollbar */}
                    <motion.div
                        className="flex flex-row items-center gap-1 h-full overflow-x-auto hide-scrollbar"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isExpanded ? 1 : 0 }}
                        transition={{ duration: 0.2, delay: isExpanded ? 0.05 : 0 }}
                    >
                        <div className="flex items-center gap-1 pr-4">
                            {navItems.map((item) => {
                                const isActive = activeSection === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            scrollToSection(item.id);
                                        }}
                                        className={`text-[11px] px-3 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap flex-shrink-0 ${isActive
                                            ? "bg-[#ff6a00] text-white font-medium shadow-sm"
                                            : "bg-transparent text-gray-600 hover:text-[#ff6a00] hover:bg-orange-50/50"
                                            }`}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>

                </motion.div>
            </div>
        </>
    );
};
