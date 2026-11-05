"use client";

import { useEffect, useRef } from "react";
import { openLeoChat } from "@/components/ui/chatbot";
import "./face-hero.css";

/**
 * FaceHero — interactive portrait intro.
 *
 * A grayscale portrait fills the screen; a soft blob that trails the
 * cursor (or a finger on touch) punches through to the colour layer.
 * Purple wave lines drift across the bottom and
 * the name parallaxes gently against pointer movement.
 *
 * Ported from the standalone "face design" HTML page. The rAF loop is
 * paused while the section is offscreen and reduced-motion users get a
 * static composition instead of the animated one.
 */

export function FaceHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const nameStackRef = useRef<HTMLDivElement>(null);
  const wavesRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const hero = sectionRef.current;
    const nameEl = nameRef.current;
    const canvas = wavesRef.current;
    if (!hero || !nameEl || !canvas) return;
    // Colour reveal layers: the full-bleed photo (desktop) and the inset
    // portrait (mobile). Only one is visible at a time.
    const colorLayers = Array.from(
      hero.querySelectorAll<HTMLImageElement>(".fh-color")
    );
    if (colorLayers.length === 0) return;

    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!isTouch && !reduce) hero.classList.add("no-cursor");

    const BLOB_R = () =>
      Math.max(70, Math.min(130, window.innerWidth * 0.085));

    let mouse = { x: window.innerWidth * 0.72, y: window.innerHeight * 0.4 };
    let blob = { x: mouse.x, y: mouse.y };
    let active = false;
    let raf = 0;
    let running = true;
    let waveT = 0;
    let parallax = { x: 0, y: 0 };
    let parallaxCur = { x: 0, y: 0 };

    const cleanupFns: (() => void)[] = [];

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    // Entrance choreography: start as soon as the page is being revealed —
    // either immediately (repeat visits, no boot loader), while the boot
    // overlay is mid-fade, or once it is fully gone. This keeps the text
    // from feeling slow on first load.
    const startEntrance = () => {
      nameEl.classList.add("fh-in");
      nameStackRef.current?.classList.add("fh-in");
    };
    const bootOverlayFading = () => {
      const overlay = document.querySelector(
        'div[style*="9999"]'
      ) as HTMLElement | null;
      return !!overlay && parseFloat(overlay.style.opacity || "1") < 0.95;
    };
    if (
      getComputedStyle(nameEl).visibility === "visible" ||
      bootOverlayFading()
    ) {
      startEntrance();
    } else {
      const revealPoll = window.setInterval(() => {
        if (
          getComputedStyle(nameEl).visibility === "visible" ||
          bootOverlayFading()
        ) {
          window.clearInterval(revealPoll);
          startEntrance();
        }
      }, 80);
      const revealCap = window.setTimeout(() => {
        window.clearInterval(revealPoll);
        startEntrance();
      }, 9000);
      cleanupFns.push(() => {
        window.clearInterval(revealPoll);
        window.clearTimeout(revealCap);
      });
    }

    // Imperative decorations (none currently — reveal has no ring)

    const setMouse = (x: number, y: number) => {
      mouse.x = x;
      mouse.y = y;
      parallax.x = (x / window.innerWidth - 0.5) * 2;
      parallax.y = (y / window.innerHeight - 0.5) * 2;
    };

    const onMouseMove = (e: MouseEvent) => {
      active = true;
      setMouse(e.clientX, e.clientY);
    };
    const onLeave = () => {
      active = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      active = true;
      setMouse(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      setMouse(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => {
      active = false;
    };

    if (!isTouch) {
      hero.addEventListener("mousemove", onMouseMove);
      hero.addEventListener("mouseleave", onLeave);
      hero.addEventListener("mouseenter", () => (active = true));
    } else {
      hero.addEventListener("touchstart", onTouchStart, { passive: true });
      hero.addEventListener("touchmove", onTouchMove, { passive: true });
      hero.addEventListener("touchend", onTouchEnd, { passive: true });
    }

    // ---------- Waves ----------
    const ctx = canvas.getContext("2d");
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = hero.clientHeight * dpr;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      return dpr;
    };
    let dpr = resizeCanvas();

    const drawWaves = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const lines = 8;
      ctx.lineWidth = 1.2 * dpr;
      for (let i = 0; i < lines; i++) {
        const baseY = canvas.height - (canvas.height / (lines + 1)) * (i + 0.4);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(168,85,247,${0.22 - i * 0.018})`;
        for (let x = 0; x <= canvas.width; x += 6 * dpr) {
          const nx = x / canvas.width;
          const y =
            baseY +
            Math.sin(nx * 3.2 + waveT + i * 0.55) * 34 * dpr +
            Math.sin(nx * 7.5 - waveT * 1.3 + i * 1.1) * 12 * dpr +
            parallaxCur.y * 18 * dpr * Math.sin(nx * Math.PI);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // one high arc across the upper-left
      ctx.beginPath();
      ctx.strokeStyle = "rgba(168,85,247,0.20)";
      for (let x = 0; x <= canvas.width * 0.55; x += 6 * dpr) {
        const nx = x / canvas.width;
        const y =
          canvas.height * 0.16 +
          Math.sin(nx * 5 + waveT * 0.8) * 60 * dpr +
          Math.sin(nx * 11 - waveT) * 14 * dpr;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    const updateMask = () => {
      const radius = active ? BLOB_R() : 0;
      colorLayers.forEach((el) => {
        if (el.offsetParent === null) return; // hidden at this breakpoint
        const r = el.getBoundingClientRect();
        el.style.clipPath = `circle(${radius}px at ${blob.x - r.left}px ${blob.y - r.top}px)`;
      });
    };

    const updateText = () => {
      const R = BLOB_R();
      const b = nameEl.getBoundingClientRect();
      const cx = Math.max(b.left, Math.min(blob.x, b.right));
      const cy = Math.max(b.top, Math.min(blob.y, b.bottom));
      nameEl.classList.toggle(
        "fh-hot",
        active && Math.hypot(blob.x - cx, blob.y - cy) < R
      );
    };

    // Static composition for reduced-motion users
    if (reduce) {
      colorLayers.forEach((el) => {
        el.style.clipPath = `circle(45% at 50% 42%)`;
      });
      drawWaves();
    } else {
      const tick = () => {
        if (running) {
          const R = BLOB_R();
          blob.x = lerp(blob.x, mouse.x, 0.12);
          blob.y = lerp(blob.y, mouse.y, 0.12);

          updateMask();

          parallaxCur.x = lerp(parallaxCur.x, parallax.x, 0.06);
          parallaxCur.y = lerp(parallaxCur.y, parallax.y, 0.06);
          // Parallax only applies to the absolutely-positioned desktop
          // heading; the mobile layout keeps the heading in flow.
          if (window.innerWidth > 900) {
            nameEl.style.transform = `translateY(-58%) translate(${(-parallaxCur.x * 8).toFixed(2)}px, ${(-parallaxCur.y * 8).toFixed(2)}px)`;
          }

          updateText();
          waveT += 0.008;
          drawWaves();
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    // Pause the loop while the section is offscreen
    const io = new IntersectionObserver(
      ([entry]) => {
        running = entry.isIntersecting;
      },
      { rootMargin: "60px" }
    );
    io.observe(hero);

    const onResize = () => {
      dpr = resizeCanvas();
      if (reduce) drawWaves();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cleanupFns.forEach((fn) => fn());
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      hero.removeEventListener("mousemove", onMouseMove);
      hero.removeEventListener("mouseleave", onLeave);
      hero.removeEventListener("touchstart", onTouchStart);
      hero.removeEventListener("touchmove", onTouchMove);
      hero.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <section
      id="home"
      ref={sectionRef}
      className="face-hero w-full shrink-0"
      aria-label="Intro"
    >
      <div className="fh-bg-stack">
        {/* Bottom: grayscale; top: colour, revealed through the blob mask.
            loading="lazy" skips the download entirely on mobile, where
            this stack is display:none. */}
        <img
          src="/face/bg-wide.webp"
          alt="Leo Joseph"
          draggable={false}
          loading="lazy"
          decoding="async"
          className="fh-gray"
        />
        <img
          src="/face/bg-wide.webp"
          alt=""
          draggable={false}
          aria-hidden
          loading="lazy"
          decoding="async"
          className="fh-color"
        />
      </div>
      <div className="fh-shade" aria-hidden />
      <canvas className="fh-waves" ref={wavesRef} aria-hidden />
      {/* Layered dissolve: portrait, waves and shade sink into the same
          deep black the hero below emerges from — no visible seam. */}
      <div className="fh-fade" aria-hidden />

      <div className="fh-name-stack" ref={nameStackRef}>
      <h1 className="fh-name" ref={nameRef}>
        <span className="fh-first">Let&rsquo;s Connect</span>
        <span className="fh-last">&amp; Collaborate</span>
        <hr className="fh-rule" />
      </h1>

      {/* CTA: opens the SAME Leo AI chatbot instance as the floating
          bottom-right icon (see openLeoChat in chatbot.tsx). Kept outside
          the h1 so the heading semantics stay clean. */}
      <div className="fh-chat-cta">
        <button
          type="button"
          className="fh-chat-btn"
          onClick={openLeoChat}
          aria-label="Chat with Leo AI — opens the chat window"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Chat with Leo AI</span>
        </button>
      </div>
      </div>

      {/* Mobile composition: full-bleed colour portrait background with
          the grayscale-to-colour reveal, name overlaid on the left. */}
      <div className="fh-portrait" aria-hidden>
        <img
          src="/face/portrait-hero.webp"
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          fetchPriority="high"
          className="fh-gray"
        />
        <img
          src="/face/portrait-hero.webp"
          alt=""
          draggable={false}
          aria-hidden
          loading="lazy"
          decoding="async"
          className="fh-color"
        />
      </div>

      <div className="fh-touch-hint">touch &amp; drag to reveal</div>
    </section>
  );
}
