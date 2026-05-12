import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "Large Dumbbells Dashboard",
  description: "DM & Calls Pipeline",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex" style={{ background: '#0a0a0a' }}>
        <Sidebar />
        <main className="flex-1 min-w-0 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}