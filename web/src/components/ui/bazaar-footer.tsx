"use client";

import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TwitterIcon,
} from "lucide-react";

const footerLinks = [
  {
    title: "Marketplace",
    links: [
      { href: "collections", label: "Browse collections" },
      { href: "stores", label: "Featured Sellers" },
      { href: "#", label: "New Arrivals" },
      { href: "#", label: "Best Sellers" },
      { href: "#", label: "Flash Sales" },
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
    <footer className="bg-[#FFFFFF] pt-16 pb-0 overflow-hidden min-h-screen flex flex-col items-center">
      <div className="flex flex-col justify-between w-fit max-w-full px-4 lg:px-8 flex-1 h-full min-h-screen">
        <div className="w-full flex flex-col lg:flex-row justify-between gap-12 lg:gap-20 mt-12 mb-auto">

          {/* Left Column: Socials & Contact */}
          <div className="flex flex-col gap-8 lg:max-w-xs mt-16">
            {/* Social Icons */}
            <div className="flex gap-4">
              {socialLinks.map(({ icon: Icon, href }, i) => (
                <a
                  href={href}
                  className="group flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 hover:border-orange-500 hover:bg-orange-50 transition-colors duration-300"
                  key={i}
                >
                  <Icon className="w-5 h-5 text-gray-600 group-hover:text-orange-600 transition-colors" />
                </a>
              ))}
            </div>

            {/* Contact Info */}
            <div className="flex flex-col gap-4 text-[#1a2b3b]/60 text-xs font-medium leading-relaxed">
              <p>
                123 Global Trade Blvd,<br />
                Commerce City, World 10101
              </p>
              <p>
                support@bazaarx.com
              </p>
              <p>
                (+1) 555-0123
              </p>
            </div>
          </div>

          {/* Right Column: Links Grid */}
          <div className="flex flex-wrap justify-start lg:justify-end gap-x-12 gap-y-10 lg:gap-x-24 mt-20">
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
        <div className="w-full mt-auto pb-10 overflow-hidden">
          <div className="w-full flex justify-center items-end pt-12">
            <div className="relative flex flex-row items-baseline gap-4 lg:gap-8">
              <div className="absolute -top-6 left-1 text-[10px] uppercase tracking-[0.2em] text-gray-500 whitespace-nowrap">
                © BazaarX {new Date().getFullYear()}
              </div>
              <h1 className="font-fondamento text-[15vw] -mb-4 leading-none text-[#FF6A00] tracking-tighter cursor-default select-none transition-all duration-300">
                BazaarX
              </h1>
              <span className="text-orange-500 font-bold text-[10px] lg:text-sm uppercase tracking-[0.2em] whitespace-nowrap mb-1 lg:mb-3">
                From global factories directly to your doorstep
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}