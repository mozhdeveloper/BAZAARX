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
      { href: "#", label: "Browse Categories" },
      { href: "#", label: "Featured Sellers" },
      { href: "#", label: "New Arrivals" },
      { href: "#", label: "Best Sellers" },
      { href: "#", label: "Flash Sales" },
      { href: "#", label: "Local Products" },
      { href: "#", label: "International Brands" },
      { href: "#", label: "Bazaar Business" },
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
    <footer className="bg-[#FFFFFF] pt-8 pb-0 overflow-hidden min-h-screen flex flex-col justify-between">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 w-full flex flex-col flex-1">
        {/* Links Container */}
        <div className="flex flex-wrap justify-end gap-x-16 gap-y-12 mb-auto pr-2 lg:pr-12">
          {footerLinks.map((item, i) => (
            <div key={i} className="min-w-[160px]">
              <h3 className="mb-6 text-sm font-bold text-orange-600 uppercase tracking-widest">
                {item.title}
              </h3>
              <ul className="space-y-3 text-[#1a2b3b]/60 text-sm font-medium">
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
      <div className="relative w-full">
        <div className="w-full px-4 flex items-end mb-6 text-[10px] uppercase tracking-[0.2em]">
          <span className="text-gray-500">© BazaarX {new Date().getFullYear()}</span>
        </div>

        <h1 className="font-fondamento text-[22vw] leading-[0.7] ml-2 text-[#FF6A00] text-left tracking-tighter pointer-events-none select-none -ml-2">
          BazaarX
        </h1>

        {/* Social & App Links - Bottom Right */}
        <div className="absolute bottom-6 right-6 z-20 flex flex-col items-end gap-4">
          {/* Social Icons */}
          <div className="flex gap-2">
            {socialLinks.map(({ icon: Icon, href }, i) => (
              <a
                href={href}
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon",
                  className: "rounded-full hover:bg-white text-gray-400 hover:text-orange-500"
                })}
                key={i}
              >
                <Icon className="size-6" />
              </a>
            ))}
          </div>

          {/* App Buttons */}
          <div className="flex gap-3 items-center">
            <a href="#" className="transition-transform hover:scale-105 opacity-80 hover:opacity-100 grayscale hover:grayscale-0">
              <AppStoreButton />
            </a>
            <a href="#" className="transition-transform hover:scale-105 opacity-80 hover:opacity-100 grayscale hover:grayscale-0">
              <PlayStoreButton />
            </a>
          </div>

          <div className="w-full px-4 flex justify-between items-end text-[10.2px] uppercase tracking-[0.2em]">
            <span className="text-orange-500 mt-4 font-bold">From global factories directly to your doorstep</span>
          </div>
        </div>
      </div>
    </footer>
  );
}