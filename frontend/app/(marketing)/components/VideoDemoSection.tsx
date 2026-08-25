"use client";

import { useTranslation } from "@/lib/i18n";

export function VideoDemoSection() {
  const { t } = useTranslation();

  return (
    <section className="px-6 py-16 bg-off/50">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="text-3xl font-display font-bold text-ink sm:text-4xl">
            {t('videoDemoTitle')}
          </h2>
          <p className="mt-4 text-lg text-muted">
            {t('videoDemoSubtitle')}
          </p>
        </div>
        
        {/* Responsive 16:9 Video Wrapper */}
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-soft border border-border bg-panel">
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src="https://www.youtube.com/embed/dexxL23lAbo?cc_load_policy=0&cc_lang_pref=xx"
            title="QuickCheck System Overview"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </section>
  );
}
