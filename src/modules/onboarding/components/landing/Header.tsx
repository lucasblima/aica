import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  onLoginClick: () => void;
  onSignUpClick: () => void;
}

export function Header({ onLoginClick, onSignUpClick }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [language, setLanguage] = React.useState('PT-BR');

  const languages = [
    { code: 'PT-BR', label: 'Português (Brasil)' },
    { code: 'EN', label: 'English' },
    { code: 'ES', label: 'Español' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E8E6E0]">
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
          {/* Language Selector */}
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="text-sm text-[#5C554B] bg-transparent border border-[#E8E6E0] rounded-lg px-3 py-2 cursor-pointer hover:border-[#6B9EFF] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B9EFF] focus:ring-offset-0"
              aria-label="Language selector"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Login Button */}
          <button
            onClick={onLoginClick}
            className="text-sm font-500 text-[#5C554B] px-4 py-2 border border-[#E8E6E0] rounded-lg hover:bg-[#F8F7F5] hover:border-[#6B9EFF] transition-all focus:outline-none focus:ring-2 focus:ring-[#6B9EFF]"
            aria-label="Login to your account"
          >
            Entrar
          </button>

          {/* Sign Up Button */}
          <button
            onClick={onSignUpClick}
            className="text-sm font-600 text-white px-5 py-2 bg-[#6B9EFF] rounded-lg hover:bg-[#5A8FEF] transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#6B9EFF] focus:ring-offset-2"
            aria-label="Create a new account"
          >
            Começar
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 hover:bg-[#F8F7F5] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B9EFF]"
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
        <div className="md:hidden bg-white border-t border-[#E8E6E0] p-4 space-y-3 animate-fade-in-up">
          {/* Language Selector Mobile */}
          <div>
            <label className="text-xs font-bold text-[#5C554B] uppercase tracking-wider mb-2 block">
              Idioma
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full text-sm text-[#5C554B] bg-[#F8F7F5] border border-[#E8E6E0] rounded-lg px-3 py-2 cursor-pointer hover:border-[#6B9EFF] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B9EFF]"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Login Button Mobile */}
          <button
            onClick={() => {
              onLoginClick();
              setMobileMenuOpen(false);
            }}
            className="w-full text-sm font-500 text-[#2B1B17] px-4 py-3 border border-[#E8E6E0] rounded-lg hover:bg-[#F8F7F5] transition-all focus:outline-none focus:ring-2 focus:ring-[#6B9EFF]"
          >
            Entrar
          </button>

          {/* Sign Up Button Mobile */}
          <button
            onClick={() => {
              onSignUpClick();
              setMobileMenuOpen(false);
            }}
            className="w-full text-sm font-600 text-white px-4 py-3 bg-[#6B9EFF] rounded-lg hover:bg-[#5A8FEF] transition-all focus:outline-none focus:ring-2 focus:ring-[#6B9EFF]"
          >
            Começar
          </button>
        </div>
      )}
    </header>
  );
}
