import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import Footer from "@/components/landing/Footer";

export default function Landing() {
  return (
    <main className="bg-canvas">
      <Hero />
      <HowItWorks />
      <Features />
      <Footer />
    </main>
  );
}