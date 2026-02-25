"use client";

import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TwitterIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PlayStoreButton } from "@/components/ui/play-store-button";
import { AppStoreButton } from "@/components/ui/app-store-button";

const footerLinks = [
  {
    title: "Marketplace",
    links: [
      { href: "collections", label: "Browse collections" },
      { href: "#", label: "Featured Sellers" },
      { href: "#", label: "New Arrivals" },
      { href: "#", label: "Best Sellers" },
      { href: "#", label: "Flash Sales" },
      { href: "#", label: "Local Products" },
      { href: "#", label: "International Brands" },
      { href: "#", label: "Bazaar Business" },
    ],
  },
  {
    title: "Customer Care",
    links: [
      { href: "#", label: "Help Center" },
      { href: "#", label: "Track Order" },
      { href: "#", label: "Shipping Info" },
      { href: "#", label: "Returns & Refunds" },
      { href: "#", label: "Payment Options" },
      { href: "#", label: "BazaarX Guarantee" },
    ],
  },
  {
    title: "About BazaarX",
    links: [
      { href: "#bazaar-history", label: "Our Story" },
      { href: "#", label: "Press & Media" },
      { href: "#", label: "Careers" },
      { href: "#", label: "Investor Relations" },
      { href: "#", label: "Community Impact" },
      { href: "#", label: "Sustainability" },
    ],
  },
  {
    title: "Legal & Privacy",
    links: [
      { href: "#", label: "Terms of Service" },
      { href: "#", label: "Privacy Policy" },
      { href: "#", label: "Cookie Policy" },
      { href: "#", label: "Data Protection" },
      { href: "#", label: "Intellectual Property" },
      { href: "#", label: "Dispute Resolution" },
      { href: "#", label: "Accessibility" },
    ],
  },
];

const socialLinks = [
  { icon: FacebookIcon, href: "#" },
  { icon: InstagramIcon, href: "#" },
  { icon: LinkedinIcon, href: "#" },
  { icon: TwitterIcon, href: "#" },
];

export function BazaarFooter() {
  return (
    <footer className="bg-[#FFFFFF] pt-8 pb-0 overflow-hidden min-h-screen flex flex-col justify-between">
      <div className="w-full px-4 lg:px-8 flex flex-col flex-1">
        {/* Links Container */}
        <div className="flex flex-wrap justify-start gap-x-20 gap-y-10 mt-12 lg:mt-32 mb-auto">
          {footerLinks.map((item, i) => (
            <div key={i} className="min-w-[140px]">
              <h3 className="mb-4 text-xs font-bold text-orange-600 uppercase tracking-widest">
                {item.title}
              </h3>
              <ul className="space-y-2.5 text-[#1a2b3b]/60 text-xs font-medium">
                {item.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="hover:text-orange-600 transition-colors block"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section - Responsive Layout */}
      <div className="w-full px-4 lg:px-8 mt-auto pb-10 overflow-hidden">
        <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-gray-500">
          © BazaarX {new Date().getFullYear()}
        </div>

        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 max-w-full">
          <div className="flex flex-col lg:flex-row lg:items-baseline gap-4 lg:gap-8 -ml-1">
            <h1 className="font-fondamento text-[13vw] leading-[0.85] text-[#FF6A00] tracking-tighter cursor-default select-none transition-all duration-300">
              BazaarX
            </h1>
            <span className="text-orange-500 font-bold text-[10px] lg:text-xs uppercase tracking-[0.2em] mb-2 lg:mb-5 whitespace-nowrap">
              From global factories directly to your doorstep
            </span>
          </div>

          <div className="flex flex-col items-start xl:items-end gap-6 z-20 shrink-0 mb-1">
            <div className="flex gap-2">
              {socialLinks.map(({ icon: Icon, href }, i) => (
                <a
                  href={href}
                  className={buttonVariants({
                    variant: "ghost",
                    size: "icon",
                    className: "rounded-full hover:bg-orange-50 text-gray-400 hover:text-orange-500 transition-colors duration-300"
                  })}
                  key={i}
                >
                  <Icon className="size-5" />
                </a>
              ))}
            </div>

            <div className="flex gap-3 items-center">
              <a href="#" className="transition-transform hover:scale-105 opacity-80 hover:opacity-100 grayscale hover:grayscale-0 duration-300">
                <AppStoreButton />
              </a>
              <a href="#" className="transition-transform hover:scale-105 opacity-80 hover:opacity-100 grayscale hover:grayscale-0 duration-300">
                <PlayStoreButton />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}