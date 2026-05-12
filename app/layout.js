import { Geist } from "next/font/google";
import "./globals.css";
import Footer from "./components/Footer";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "Large Dumbbells Dashboard",
  description: "DM & Outreach Pipeline",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ background: '#0a0a0a' }}>
        <main className="flex-1 min-w-0 flex flex-col">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}