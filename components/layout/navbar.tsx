"use client";

import Image from "next/image";
import Link from "next/link";
import { APP_LOGO, APP_NAME, APP_TAGLINE } from "@/lib/app-config";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-blue-100 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        {/* Logo + Brand */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src={APP_LOGO}
            alt={`${APP_NAME} Logo`}
            width={52}
            height={52}
            className="h-12 w-auto rounded-xl object-contain"
            priority
          />
          <div className="leading-tight">
            <h1 className="text-2xl font-bold tracking-tight text-blue-900">{APP_NAME}</h1>
            <p className="text-xs text-slate-500">{APP_TAGLINE}</p>
          </div>
        </Link>

        {/* Desktop Navigation – Dropdowns */}
        <nav className="hidden lg:flex items-center gap-8">
          {/* Product Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-blue-700 transition">
              Product
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute left-0 mt-2 w-48 rounded-xl border border-blue-100 bg-white shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <Link href="/features" className="block px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-t-xl">Features</Link>
              <Link href="/modules" className="block px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700">Modules</Link>
              <Link href="/pricing" className="block px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700">Pricing</Link>
              <Link href="/updates" className="block px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-b-xl">Updates</Link>
            </div>
          </div>

          {/* Company Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-blue-700 transition">
              Company
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute left-0 mt-2 w-48 rounded-xl border border-blue-100 bg-white shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <Link href="/aboutus" className="block px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-t-xl">About Us</Link>
              <Link href="/contact" className="block px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700">Contact</Link>
              <Link href="/privacy-policy" className="block px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700">Privacy Policy</Link>
              <Link href="/terms" className="block px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-b-xl">Terms</Link>
            </div>
          </div>

          {/* Support Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-blue-700 transition">
              Support
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-blue-100 bg-white shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <Link href="/support" className="block px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-t-xl">Help Center</Link>
              <Link href="/docs" className="block px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700">Documentation</Link>
              <Link href="/videos" className="block px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700">Video Tutorials</Link>
              <Link href="/contact-support" className="block px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-b-xl">Contact Support</Link>
            </div>
          </div>
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          <Link href="/login" className="rounded-full border border-blue-200 bg-white px-5 py-2 text-sm font-medium text-blue-900 transition hover:border-blue-300 hover:bg-blue-50">
            Login
          </Link>
          <Link href="/signup" className="rounded-full bg-linear-to-r from-blue-700 to-blue-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-blue-200 transition hover:scale-105">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}