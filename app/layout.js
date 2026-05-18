import { Geist, Anton } from "next/font/google";
import "./globals.css";
import Footer from "./components/Footer";
import { DialerProvider } from "@/components/Dialer";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

export const metadata = {
  title: "Large Dumbbells Dashboard",
  description: "DM & Outreach Pipeline",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geist.variable} ${anton.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ background: '#0a0a0a' }}>
        <DialerProvider>
          <main className="flex-1 min-w-0 flex flex-col">
            {children}
          </main>
          <Footer />
        </DialerProvider>
      </body>
    </html>
  );
}