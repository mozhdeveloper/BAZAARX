import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "terms" | "privacy";
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, type }) => {
  const content = {
    terms: {
      title: "Terms of Service",
      lastUpdated: "April 2024",
      sections: [
        {
          title: "1. Acceptance of Terms",
          content: "By accessing and using BazaarX, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.",
        },
        {
          title: "2. User Accounts",
          content: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must be at least 18 years old to create an account.",
        },
        {
          title: "3. Buying on BazaarX",
          content: "All purchases made through BazaarX are subject to product availability. We reserve the right to refuse any order you place with us. Prices for our products are subject to change without notice.",
        },
        {
          title: "4. Intellectual Property",
          content: "The content on BazaarX, including text, graphics, logos, and software, is the property of BazaarX and is protected by intellectual property laws.",
        },
        {
          title: "5. Limitation of Liability",
          content: "BazaarX shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the platform.",
        },
      ],
    },
    privacy: {
      title: "Privacy Policy",
      lastUpdated: "April 2024",
      sections: [
        {
          title: "1. Information We Collect",
          content: "We collect information you provide directly to us, such as when you create an account, make a purchase, or contact customer support. This may include your name, email address, phone number, and payment information.",
        },
        {
          title: "2. How We Use Your Information",
          content: "We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices, and communicate with you about products and services.",
        },
        {
          title: "3. Sharing of Information",
          content: "We do not share your personal information with third parties except as described in this policy, such as with vendors who perform services for us or when required by law.",
        },
        {
          title: "4. Data Security",
          content: "We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction.",
        },
        {
          title: "5. Your Choices",
          content: "You may update your account information at any time by logging into your account settings. You can also opt out of receiving promotional communications from us.",
        },
      ],
    },
  };

  const activeContent = content[type];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white border-none rounded-[24px] shadow-2xl overflow-hidden p-0 gap-0">

        <DialogHeader className="p-8 pb-6">
          <DialogTitle className="font-heading text-3xl text-[#7C2D12] tracking-tight">
            {activeContent.title}
          </DialogTitle>
          <DialogDescription className="text-[#92400E] font-medium opacity-80">
            Last updated: {activeContent.lastUpdated}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] p-8 pt-0">
          <div className="space-y-8">
            {activeContent.sections.map((section, index) => (
              <div key={index} className="space-y-3 group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FFE0B2] flex items-center justify-center text-[#EA580C] font-bold text-sm">
                    {index + 1}
                  </div>
                  <h3 className="font-bold text-xl text-[#7C2D12]">
                    {section.title.split('. ')[1] || section.title}
                  </h3>
                </div>
                <p className="text-[#78350F] leading-relaxed font-sans pl-11">
                  {section.content}
                </p>
              </div>
            ))}
            
            <div className="pt-8 text-center">
              <p className="text-xs text-[#A8A29E] uppercase tracking-widest font-bold">
                © 2024 BazaarX Philippines • Secure & Trusted
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="p-6 flex justify-end">
          <button
            onClick={onClose}
            className="group relative px-10 py-3 bg-[#FB8C00] text-white font-bold rounded-full hover:bg-[#EA580C] transition-all shadow-[0_4px_15px_rgba(251,140,0,0.4)] hover:shadow-[0_6px_20px_rgba(251,140,0,0.5)] uppercase tracking-widest text-xs flex items-center gap-2"
          >
            I Understand
            <div className="absolute inset-0 rounded-full bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-300"></div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


