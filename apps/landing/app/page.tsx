import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Problem } from "@/components/Problem";
import { Solution } from "@/components/Solution";
import { BindingTiers } from "@/components/BindingTiers";
import { Footer } from "@/components/Footer";

export default function LandingPage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <BindingTiers />
      </main>
      <Footer />
    </>
  );
}
