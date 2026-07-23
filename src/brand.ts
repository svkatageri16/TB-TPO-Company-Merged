/**
 * Centralized Branding Configuration for VEGA
 * All UI components should import and reference this configuration to ensure consistency.
 */
export const BRAND = {
  name: "VEGA",
  shortName: "VEGA",
  tagline: "Connecting Talent. Accelerating Careers.",
  secondaryTagline: "AI Powered Career Intelligence Platform",
  website: "https://vega-careers.com",
  supportEmail: "support@vega.com",
  logo: "VEGA",
  logoIcon: "VEGA_ICON",
  favicon: "/favicon.ico",
  
  // Colors mapped to Tailwind class equivalents or hex values
  colors: {
    primary: "royal-blue",     // #2563EB
    secondary: "purple",       // #7C3AED
    accent: "purple",          // #7C3AED
    success: "emerald-green",  // #10B981
    warning: "orange",         // #F59E0B
    danger: "red",             // #E11D48
    background: "soft-white",  // #F8FAFC
    cards: "pure-white",       // #FFFFFF
    text: "dark-slate"         // #0F172A
  },

  borderRadius: "rounded-[40px]",
  gradient: "from-blue-600 to-purple-600",
  typography: {
    sans: "Inter",
    display: "Space Grotesk",
    mono: "JetBrains Mono"
  },
  copyright: `© 2026 VEGA. AI Powered Career Intelligence Platform. All Rights Reserved.`,

  // Centralized feature names to quickly handle branding modifications
  features: {
    dashboard: "VEGA Dashboard",
    ai: "VEGA AI",
    employabilityScore: "VEGA Employability Score",
    assistant: "VEGA AI Assistant",
    analytics: "VEGA Intelligence",
    interview: "VEGA Interview",
    assessment: "VEGA Assessment",
    rewards: "VEGA Rewards",
    rewardsCenter: "VEGA Rewards Center",
    wallet: "VEGA VEGA XP Wallet",
    certificateIssuer: "VEGA"
  }
};
