import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { pickRandomBackground } from '../lib/backgrounds';
import { cn } from '../components/ui/cn';

export const WelcomePage: React.FC<{ onContinueAsGuest: () => void }> = ({
  onContinueAsGuest,
}) => {
  const { authBusy, authError, signInWithGoogle, clearAuthError } = useAuth();
  const { t } = useTranslation();

  const [selectedBg] = useState(() => pickRandomBackground('space'));
  const [bgLoaded, setBgLoaded] = useState(false);

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-between overflow-hidden bg-[#050a18] px-6 py-10 text-slate-100">
      {/* Space background image from public/backgrounds/space/ + dark gradient overlay */}
      <div
        aria-hidden="true"
        data-testid="welcome-background-layer"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#050a18]"
      >
        <img
          src={selectedBg.src}
          alt=""
          loading="eager"
          decoding="async"
          onLoad={() => setBgLoaded(true)}
          className={cn(
            'space-bg-drift h-full w-full object-cover transition-opacity duration-500',
            bgLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
        <div
          data-testid="welcome-background-overlay"
          className="absolute inset-0 bg-gradient-to-b from-[#050a18]/80 via-[#050a18]/68 to-[#050a18]/92"
        />
      </div>

      <div aria-hidden="true" className="h-4" />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center py-12 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl text-balance">
          {t('welcome.title')}
        </h1>

        <p className="mt-5 max-w-sm text-base leading-relaxed text-slate-300 text-balance">
          {t('welcome.subtitle')}
        </p>

        <div className="mt-10 flex w-full max-w-xs flex-col gap-3.5">
          <button
            type="button"
            data-testid="welcome-google-btn"
            disabled={authBusy}
            onClick={() => {
              clearAuthError();
              void signInWithGoogle();
            }}
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-3 rounded-lg bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050a18] disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4 shrink-0"
              viewBox="0 0 24 24"
            >
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>{authBusy ? t('common.signingIn') : t('welcome.googleAction')}</span>
          </button>

          <button
            type="button"
            data-testid="welcome-guest-btn"
            disabled={authBusy}
            onClick={() => {
              clearAuthError();
              onContinueAsGuest();
            }}
            className="inline-flex min-h-[46px] w-full items-center justify-center rounded-lg border border-slate-700/80 bg-transparent px-5 py-3 text-sm font-medium text-slate-200 transition-colors duration-200 hover:border-slate-500 hover:bg-slate-800/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050a18] disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
          >
            {t('welcome.guestAction')}
          </button>
        </div>

        {authError && (
          <p
            role="alert"
            className="mt-6 max-w-xs text-xs leading-relaxed text-rose-300"
          >
            {authError}
          </p>
        )}
      </div>

      <footer
        data-testid="welcome-footer"
        className="relative z-10 w-full max-w-4xl text-center text-xs text-slate-400"
      >
        <span>
          {t('common.footerImageCaption')} ({selectedBg.label})
        </span>
      </footer>
    </main>
  );
};
