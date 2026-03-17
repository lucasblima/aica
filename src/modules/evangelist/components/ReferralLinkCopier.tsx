import { useState, useCallback } from 'react';

interface ReferralLinkCopierProps {
  referralCode: string;
}

const SHARE_TEXT_TEMPLATE = (link: string) =>
  `Estou usando o AICA, sistema de produtividade com IA. Acessa pelo meu link e já comeca com acesso especial: ${link}`;

export function ReferralLinkCopier({ referralCode }: ReferralLinkCopierProps) {
  const [copied, setCopied] = useState(false);
  const link = `https://aica.guru?ref=${referralCode}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text in the display element
    }
  }, [link]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: 'AICA Life OS',
      text: SHARE_TEXT_TEMPLATE(link),
      url: link,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy the share text to clipboard
        await navigator.clipboard.writeText(SHARE_TEXT_TEMPLATE(link));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User cancelled share dialog or clipboard failed
    }
  }, [link]);

  return (
    <div className="bg-ceramic-base rounded-xl p-4 shadow-ceramic-emboss">
      <label className="block text-sm font-medium ceramic-text-primary mb-2">
        Seu link de indicacao
      </label>

      <div className="flex items-center gap-2">
        <div className="flex-1 bg-ceramic-cool rounded-lg px-3 py-2 text-sm ceramic-text-secondary truncate select-all">
          {link}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
            copied
              ? 'bg-ceramic-success/10 text-ceramic-success'
              : 'bg-amber-500 hover:bg-amber-600 text-white'
          }`}
        >
          {copied ? '\u2713 Copiado!' : 'Copiar'}
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium bg-ceramic-cool hover:bg-ceramic-border ceramic-text-primary transition-colors duration-200"
        >
          Compartilhar
        </button>
      </div>
    </div>
  );
}
