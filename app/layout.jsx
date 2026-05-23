import "./globals.css";

export const metadata = {
  title: "SAN — AI Weekend Travel Agent",
  description:
    "AI-powered weekend trip planner for working professionals, friend groups, bikers, families, and travelers across India. Plan Friday-night-to-Monday-morning getaways instantly.",
  keywords: "weekend trip planner, travel India, AI travel agent, budget travel, road trip planner",
  openGraph: {
    title: "SAN — AI Weekend Travel Agent",
    description: "Plan the perfect weekend getaway across India. Budget-optimized, office-safe, AI-powered.",
    type: "website"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
