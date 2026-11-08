"use client";

import { useId, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "./qa-illustration.module.css";

/** Decorative QA artwork; the checks illustrate testing rather than reporting live results. */
export function QaIllustration() {
  const id = useId().replace(/:/g, "");
  const [paused, setPaused] = useState(false);
  const paint = (name: string) => `url(#${id}-${name})`;

  return (
    <div
      className={`relative mx-auto w-full max-w-64 lg:max-w-80 xl:max-w-96 ${paused ? styles.paused : ""}`}
    >
      <svg
        aria-hidden="true"
        className="block h-auto w-full overflow-visible"
        viewBox="0 0 480 350"
      >
        <defs>
          <linearGradient id={`${id}-mint`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="var(--auth-mint-soft)" />
            <stop offset="1" stopColor="var(--auth-emerald)" />
          </linearGradient>
          <linearGradient id={`${id}-deep`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="var(--auth-emerald)" />
            <stop offset="1" stopColor="var(--auth-deep)" />
          </linearGradient>
          <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="var(--auth-surface)" />
            <stop offset="1" stopColor="var(--auth-mint-soft)" />
          </linearGradient>
          <filter id={`${id}-shadow`} x="-30%" y="-30%" width="170%" height="180%">
            <feDropShadow
              dx="0"
              dy="12"
              stdDeviation="10"
              floodColor="var(--auth-ink)"
              floodOpacity="0.28"
            />
          </filter>
        </defs>

        <ellipse cx="243" cy="322" rx="153" ry="12" fill="var(--auth-ink)" opacity="0.2" />

        <g filter={paint("shadow")}>
          {/* A slow gear turns behind the checklist and laptop. */}
          <g transform="translate(354 119)">
            <g className="motion-safe:animate-[spin_36s_linear_infinite]">
              {Array.from({ length: 8 }, (_, index) => (
                <rect
                  key={index}
                  x="-12"
                  y="-73"
                  width="24"
                  height="35"
                  rx="7"
                  fill={paint("mint")}
                  transform={`rotate(${index * 45})`}
                />
              ))}
              <circle r="53" fill={paint("mint")} stroke="var(--auth-mint-soft)" strokeWidth="2" />
              <circle r="27" fill="var(--auth-deep)" />
              <circle
                r="28"
                fill="none"
                stroke="var(--auth-emerald)"
                strokeWidth="4"
                opacity="0.65"
              />
            </g>
          </g>

          <g transform="rotate(-5 166 160)">
            <rect x="75" y="51" width="180" height="236" rx="25" fill={paint("deep")} />
            <rect
              x="67"
              y="45"
              width="180"
              height="236"
              rx="25"
              fill={paint("mint")}
              stroke="var(--auth-mint-soft)"
              strokeWidth="2"
            />
            <rect x="81" y="62" width="151" height="201" rx="15" fill={paint("paper")} />
            <path
              d="M124 50V40Q124 31 135 31H147Q148 10 164 10Q184 10 185 31H195Q207 31 207 42V62H124Z"
              fill={paint("deep")}
              stroke="var(--auth-emerald)"
              strokeWidth="2"
            />
            <circle cx="165" cy="31" r="8" fill={paint("paper")} />
            {[101, 153, 205].map((y, index) => (
              <g key={y}>
                <rect
                  x="99"
                  y={y}
                  width="27"
                  height="27"
                  rx="5"
                  fill="none"
                  stroke="var(--auth-emerald)"
                  strokeWidth="3"
                  opacity="0.7"
                />
                <path
                  className={styles.check}
                  style={{ animationDelay: `${index * 0.65}s` }}
                  d={`M105 ${y + 12}l7 7 17-21`}
                  fill="none"
                  stroke="var(--auth-emerald)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect
                  x="140"
                  y={y + 3}
                  width={index === 1 ? 55 : 69}
                  height="7"
                  rx="3.5"
                  fill="var(--auth-emerald)"
                  opacity="0.45"
                />
                <rect
                  x="140"
                  y={y + 17}
                  width="43"
                  height="6"
                  rx="3"
                  fill="var(--auth-emerald)"
                  opacity="0.2"
                />
              </g>
            ))}
          </g>

          <g className={styles.float}>
            <path
              d="M190 144Q192 132 206 132H365Q380 132 377 148L356 272H169Z"
              fill={paint("deep")}
              stroke="var(--auth-mint)"
              strokeWidth="3"
            />
            <path d="M204 157H360L343 255H187Z" fill={paint("paper")} />
            {[333, 347, 361].map((x) => (
              <circle key={x} cx={x} cy="145" r="3" fill="var(--auth-mint-soft)" />
            ))}
            <g
              fill="none"
              stroke="var(--auth-emerald)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m246 190-19 17 15 15m65-32 15 17-19 15m-22-40-17 48" />
            </g>
            <path
              d="M169 272H356L390 293Q395 299 386 305H125Q116 302 124 295Z"
              fill={paint("mint")}
              stroke="var(--auth-mint-soft)"
              strokeWidth="2"
            />
            <path d="M124 305H387L381 313H134Q126 313 124 305Z" fill="var(--auth-emerald)" />
            <path
              d="M183 281H335M173 288H345"
              stroke="var(--auth-emerald)"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.4"
            />
            <path d="M230 294H283L287 300H223Z" fill="var(--auth-mint-soft)" opacity="0.6" />
          </g>

          <g transform="translate(372 275)">
            <circle r="41" fill={paint("deep")} stroke="var(--auth-mint)" strokeWidth="2" />
            <path
              className={styles.check}
              style={{ animationDelay: "1.8s" }}
              d="m-18 0 12 13L20-15"
              fill="none"
              stroke="var(--auth-surface)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>
      </svg>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute right-0 bottom-0 rounded-full text-white/70 hover:bg-white/10 hover:text-white motion-reduce:hidden"
        aria-label={paused ? "Play QA animation" : "Pause QA animation"}
        title={paused ? "Play animation" : "Pause animation"}
        onClick={() => setPaused((value) => !value)}
      >
        {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
      </Button>
    </div>
  );
}
