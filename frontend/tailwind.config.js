/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cloud: "#F7F5F0",
        cloudDim: "#EFEBE2",
        sage: {
          DEFAULT: "#8FA88E",
          light: "#B7CBB4",
          dark: "#6C8A6B"
        },
        ink: {
          DEFAULT: "#2B3A3A",
          soft: "#4C5C5C"
        },
        blush: "#F0B8A8",
        sky: "#A9C4D1",
        amber: "#E8A34D",
        brick: "#D1685A"
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"]
      },
      boxShadow: {
        soft: "0 4px 24px -8px rgba(43, 58, 58, 0.12)",
        card: "0 2px 12px -4px rgba(43, 58, 58, 0.08)"
      },
      borderRadius: {
        xl2: "1.25rem"
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(143, 168, 142, 0.35)" },
          "50%": { boxShadow: "0 0 0 14px rgba(143, 168, 142, 0)" }
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.015)" }
        }
      },
      animation: {
        breathe: "breathe 4s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
