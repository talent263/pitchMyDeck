import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PitchMyDeck | Context-aware presentations",
  description: "Transform raw notes into tailored investor-ready presentations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
