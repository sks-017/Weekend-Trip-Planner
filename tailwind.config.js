/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"]
      },
      colors: {
        base: {
          950: "#060914",
          900: "#0a0e1a",
          800: "#0f1424",
          700: "#141a30",
          600: "#1a2240",
          500: "#232d50"
        },
        accent: {
          DEFAULT: "#00d4aa",
          light: "#4de8c8",
          dark: "#00a886"
        }
      },
      boxShadow: {
        glow: "0 0 24px rgba(0,212,170,0.12)",
        "glow-lg": "0 0 40px rgba(0,212,170,0.2)",
        "glow-amber": "0 0 24px rgba(245,166,35,0.12)",
        card: "0 8px 32px rgba(0,0,0,0.24)",
        lift: "0 20px 60px rgba(0,0,0,0.35)"
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out both",
        "slide-up": "slideUp 0.6s ease-out both",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
        "gradient-shift": "gradientShift 8s ease-in-out infinite"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" }
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" }
        }
      }
    }
  },
  plugins: []
};
