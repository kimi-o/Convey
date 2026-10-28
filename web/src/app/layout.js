import "./globals.css";
import { Poppins, Instrument_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { WalletProvider } from "@/context/WalletContext";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata = {
  title: "Convey | Secure file storage and transfer",
  description: "Own and share confidential files across an immutable system.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${poppins.variable} ${instrument.variable}`}>
      <body className="bg-canvas font-sans text-white antialiased">
        <WalletProvider>{children}</WalletProvider>
        <Toaster
          position="top-right"
          gutter={10}
          containerStyle={{ top: 24, right: 24 }}
          toastOptions={{
            duration: 3500,
            style: {
              background: "#141414",
              color: "#ffffff",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 0,
              fontSize: "13px",
              lineHeight: 1.5,
              padding: "12px 14px",
              maxWidth: 360,
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            },
            success: { iconTheme: { primary: "#5BBF8A", secondary: "#0A0A0A" } },
            error: { duration: 5000, iconTheme: { primary: "#D96C6C", secondary: "#0A0A0A" } },
          }}
        />
      </body>
    </html>
  );
}