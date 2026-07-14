import type { Metadata } from "next";
import { Big_Shoulders, Bebas_Neue, Oswald, Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { NavBar } from "@/components/NavBar";

const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  weight: "900",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  weight: "400",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  weight: ["600", "700"],
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  weight: ["400", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "classxchange",
  description: "List unused fitness class credits before they expire.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bigShoulders.variable} ${bebasNeue.variable} ${oswald.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-[color:var(--color-text)] font-sans">
        <Providers>
          <NavBar />
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
