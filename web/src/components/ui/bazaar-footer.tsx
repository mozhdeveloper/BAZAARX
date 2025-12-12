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
      { href: "#", label: "Track Your Order" },
      { href: "#", label: "Shipping Info" },
      { href: "#", label: "Returns & Refunds" },
      { href: "#", label: "Size Guide" },
      { href: "#", label: "Payment Options" },
      { href: "#", label: "Bazaar Guarantee" },
    ],
  },
  {
    title: "About Bazaar",
    links: [
      { href: "#", label: "Our Story" },
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
    <footer className="bg-card/60 border-t">
      <div className="max-w-6xl mx-auto px-4 lg:px-6">
        {/* Grid container with headings and links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-8">
          {footerLinks.map((item, i) => (
            <div key={i}>
              <h3 className="mb-4 text-xs font-semibold text-orange-600 uppercase tracking-wider">{item.title}</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                {item.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="hover:text-orange-600 hover:underline transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="h-px bg-border" />
        {/* Social Buttons + App Links */}
        <div className="py-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2 items-center">
            {socialLinks.map(({ icon: Icon, href }, i) => (
              <a
                href={href}
                className={buttonVariants({
                  variant: "outline",
                  size: "icon",
                })}
                key={i}
              >
                <Icon className="size-5 text-muted-foreground hover:text-orange-600 transition-colors" />
              </a>
            ))}
          </div>

          <div className="flex gap-4">
            <a href="#" className="transition-transform hover:scale-105">
              <AppStoreButton />
            </a>

            <a href="#" className="transition-transform hover:scale-105">
              <PlayStoreButton />
            </a>
          </div>
        </div>
        <div className="h-px bg-border" />
        <div className="text-center text-xs text-muted-foreground py-4">
          <p>
            © {new Date().getFullYear()}{" "}
            <span className="text-orange-600 font-semibold">
              BazaarPH
            </span>
            . All rights reserved. | Connecting Filipino shoppers with amazing products.
          </p>
        </div>
      </div>
    </footer>
  );
}