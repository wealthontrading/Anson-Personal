import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Smartphone, Download, X, Share, PlusSquare } from 'lucide-react';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed as PWA on home screen, do not show
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = () => {
    if (isInstallable) {
      install();
    } else {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`inline-flex items-center gap-1.5 rounded-xl font-bold transition shadow-xs active:scale-95 ${
          compact
            ? 'px-2.5 py-1 text-[11px] bg-slate-900 text-white hover:bg-slate-800'
            : 'px-3 py-1.5 text-xs bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
        title="Install on Mobile / Home Screen"
      >
        <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
        <span>Install App</span>
      </button>

      {/* Guide Modal for iOS Safari / Mobile browsers */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  AD
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Install on Your Phone</h3>
                  <p className="text-[10px] text-slate-500">Fast 1-tap access on Home Screen</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-900">Open in Mobile Browser</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Open Safari on iPhone or Chrome on Android.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Tap the Share / Menu button</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tap the <strong>Share</strong> icon (iOS) or <strong>⋮ Menu</strong> (Android).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-xs">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Select "Add to Home Screen"</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    It will install like an app icon on your home screen for quick daily use!
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
