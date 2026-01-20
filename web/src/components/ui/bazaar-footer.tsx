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
      { href: "collections", label: "Browse Collections" },
      { href: "#", label: "Featured Sellers" },
      { href: "#", label: "New Arrivals" },
      { href: "#", label: "Best Sellers" },
      { href: "#", label: "Flash Sales" },
      { href: "#", label: "Local Products" },
      { href: "#", label: "International Brands" },
      { href: "seller/auth", label: "Bazaar Business" },
      { href: "#", label: "Seller Hub" },
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
    <footer className="bg-[#FFFFFF] pt-16 sm:pt-8 pb-0 overflow-hidden min-h-screen flex flex-col justify-between">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 w-full flex flex-col flex-1">
        {/* Links Container */}
        <div className="flex flex-wrap justify-start md:justify-end gap-x-8 sm:gap-x-16 gap-y-8 sm:gap-y-12 mb-auto pr-0 lg:pr-12">
          {footerLinks.map((item, i) => (
            <div key={i} className="min-w-[140px] sm:min-w-[160px]">
              <h3 className="mb-4 sm:mb-6 text-xs sm:text-sm font-bold text-orange-600 uppercase tracking-widest">
                {item.title}
              </h3>
              <ul className="space-y-2 sm:space-y-3 text-[#1a2b3b]/60 text-xs sm:text-sm font-medium">
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

      {/* Bottom Section with Huge Text - Full Width */}
      <div className="relative w-full flex flex-col">
        {/* Mobile: Copyright top of text */}
        <div className="w-full px-4 flex md:hidden items-end mb-4 text-[10px] uppercase tracking-[0.2em]">
          <span className="text-gray-500">© BazaarX {new Date().getFullYear()}</span>
        </div>

        {/* Desktop: Copyright top of text - Keeping original structure for desktop */}
        <div className="hidden md:flex w-full px-4 items-end mb-6 text-[10px] uppercase tracking-[0.2em]">
          <span className="text-gray-500">© BazaarX {new Date().getFullYear()}</span>
        </div>

        <h1 className="font-fondamento text-[22vw] leading-[0.7] ml-2 text-[#FF6A00] text-left tracking-tighter pointer-events-none select-none">
          BazaarX
        </h1>

        {/* Social & App Links - Mobile: Stacked below, Desktop: Absolute bottom right */}
        <div className="relative md:absolute md:bottom-6 md:right-6 z-20 flex flex-col items-start md:items-end gap-4 p-4 md:p-0 mt-8 md:mt-0 bg-white md:bg-transparent">
          {/* Social Icons */}
          <div className="flex gap-2">
            {socialLinks.map(({ icon: Icon, href }, i) => (
              <a
                href={href}
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon",
                  className: "rounded-full hover:bg-gray-100 text-gray-400 hover:text-orange-500"
                })}
                key={i}
              >
                <Icon className="size-5 sm:size-6" />
              </a>
            ))}
          </div>

          {/* App Buttons */}
          <div className="flex gap-3 items-center flex-wrap">
            <a href="#" className="transition-transform hover:scale-105 opacity-80 hover:opacity-100 grayscale hover:grayscale-0">
              <AppStoreButton className="h-8 sm:h-10" />
            </a>
            <a href="#" className="transition-transform hover:scale-105 opacity-80 hover:opacity-100 grayscale hover:grayscale-0">
              <PlayStoreButton className="h-8 sm:h-10" />
            </a>
          </div>

          <div className="w-full md:px-4 flex justify-between items-end text-[10.2px] uppercase tracking-[0.2em]">
            <span className="text-orange-500 mt-2 sm:mt-4 font-bold">From global factories directly to your doorstep</span>
          </div>
        </div>
      </div>
    </footer>
  );
}