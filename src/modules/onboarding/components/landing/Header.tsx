import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  onLoginClick: () => void;
  onSignUpClick: () => void;
}

export function Header({ onLoginClick, onSignUpClick }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 bg-ceramic-base border-b border-[#E8E6E0]">
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <a
          href="/"
          className="text-[#2B1B17] text-2xl md:text-3xl font-bold hover:opacity-80 transition-opacity"
          aria-label="Aica home"
        >
          Aica
        </a>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4 ml-auto">
          {/* Login Button */}
          <button
            onClick={onLoginClick}
            className="ceramic-inset text-ceramic-text-primary hover:text-ceramic-accent text-sm font-500 px-4 py-2 transition-all focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
            aria-label="Login to your account"
          >
            Entrar
          </button>

          {/* Sign Up Button */}
          <button
            onClick={onSignUpClick}
            className="ceramic-shadow bg-ceramic-accent text-[#1F1710] hover:bg-[#C2850A] rounded-full text-sm font-semibold px-5 py-2 transition-all focus:outline-none focus:ring-2 focus:ring-ceramic-accent focus:ring-offset-2"
            aria-label="Create a new account"
          >
            Começar
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 hover:bg-[#F8F7F5] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <X size={24} className="text-[#2B1B17]" />
          ) : (
            <Menu size={24} className="text-[#2B1B17]" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-ceramic-base border-t border-[#E8E6E0] p-4 space-y-3 animate-fade-in-up">
          {/* Login Button Mobile */}
          <button
            onClick={() => {
              onLoginClick();
              setMobileMenuOpen(false);
            }}
            className="ceramic-inset text-ceramic-text-primary hover:text-ceramic-accent w-full text-sm font-500 px-4 py-3 transition-all focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
          >
            Entrar
          </button>

          {/* Sign Up Button Mobile */}
          <button
            onClick={() => {
              onSignUpClick();
              setMobileMenuOpen(false);
            }}
            className="ceramic-shadow bg-ceramic-accent text-[#1F1710] hover:bg-[#C2850A] rounded-full w-full text-sm font-semibold px-4 py-3 transition-all focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
          >
            Começar
          </button>
        </div>
      )}
    </header>
  );
}
