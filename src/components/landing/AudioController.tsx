"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Howl } from "howler";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Volume2, VolumeX, Music } from "lucide-react";

export default function AudioController() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0.18);
  const [hasInteracted, setHasInteracted] = useState(false);
  const soundRef = useRef<Howl | null>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const baseVolumeRef = useRef<number>(0.18);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const sound = new Howl({
      src: ["/audio/milad-anthem.mp3"],
      html5: true,
      loop: true,
      volume: 0.18,
      preload: true,
      onplay: () => {
        setIsPlaying(true);
      },
      onpause: () => {
        setIsPlaying(false);
      },
      onend: () => {
        // Will loop automatically
      },
    });

    soundRef.current = sound;

    const trigger = ScrollTrigger.create({
      trigger: "#milad-scrolly-container",
      start: "top top",
      end: "+=4000",
      onUpdate: (self: { progress: number }) => {
        const progress = self.progress;
        const targetVol = 0.18 + progress * (0.85 - 0.18);
        const clampedVol = Math.max(0.18, Math.min(0.85, targetVol));
        baseVolumeRef.current = clampedVol;
        setVolumeLevel(clampedVol);

        if (soundRef.current && soundRef.current.playing()) {
          soundRef.current.volume(clampedVol);
        }
      },
    });

    scrollTriggerRef.current = trigger;

    return () => {
      if (scrollTriggerRef.current) {
        scrollTriggerRef.current.kill();
        scrollTriggerRef.current = null;
      }
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.unload();
        soundRef.current = null;
      }
    };
  }, []);

  const toggleAudio = useCallback(() => {
    if (!soundRef.current) return;

    if (!hasInteracted) {
      setHasInteracted(true);
    }

    if (isPlaying) {
      soundRef.current.pause();
      setIsPlaying(false);
    } else {
      soundRef.current.volume(baseVolumeRef.current);
      soundRef.current.play();
      setIsPlaying(true);
    }
  }, [hasInteracted, isPlaying]);

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 select-none"
      dir="rtl"
    >
      {/* Mini Tooltip / Info Badge */}
      <div
        className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full border backdrop-blur-md transition-all duration-300 shadow-lg ${
          isPlaying
            ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
            : "bg-background/80 border-border text-muted-foreground"
        }`}
      >
        <Music className={`h-3.5 w-3.5 ${isPlaying ? "text-amber-500 animate-bounce" : ""}`} />
        <span className="text-[11px] font-medium font-vazirmatn">
          {isPlaying
            ? `سرود حماسی برج میلاد (${Math.round(volumeLevel * 100)}٪)`
            : "پخش سرود پیروزی مشاهیر"}
        </span>
      </div>

      {/* Floating Audio Button with Golden Pulse Ring */}
      <button
        onClick={toggleAudio}
        type="button"
        aria-label={isPlaying ? "توقف پخش سرود رسمی" : "پخش سرود رسمی برج میلاد"}
        className={`relative group flex items-center justify-center h-14 w-14 rounded-full shadow-2xl transition-all duration-300 active:scale-95 ${
          isPlaying
            ? "bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 text-white shadow-amber-500/30 ring-4 ring-amber-500/20"
            : "bg-card/90 hover:bg-card border border-border text-foreground hover:text-amber-600 hover:border-amber-500/40"
        }`}
      >
        {isPlaying && (
          <>
            <span className="absolute -inset-1 rounded-full bg-amber-400/30 animate-ping opacity-75" />
            <span className="absolute -inset-2 rounded-full border border-amber-400/40 animate-pulse" />
          </>
        )}

        <div className="relative z-10 flex items-center justify-center">
          {isPlaying ? (
            <div className="flex items-center gap-1">
              <Volume2 className="h-5 w-5 animate-pulse" />
              <div className="flex items-end gap-[2px] h-3 ps-0.5">
                <span className="w-0.5 bg-white rounded-full animate-[bounce_0.8s_infinite]" style={{ height: "60%" }} />
                <span className="w-0.5 bg-white rounded-full animate-[bounce_0.6s_infinite_0.2s]" style={{ height: "100%" }} />
                <span className="w-0.5 bg-white rounded-full animate-[bounce_1s_infinite_0.4s]" style={{ height: "40%" }} />
              </div>
            </div>
          ) : (
            <VolumeX className="h-5 w-5 text-muted-foreground group-hover:text-amber-600 transition-colors" />
          )}
        </div>
      </button>
    </div>
  );
}