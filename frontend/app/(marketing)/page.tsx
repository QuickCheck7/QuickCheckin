import { CTASection } from "./components/CTASection";
import { FeaturesSection } from "./components/FeaturesSection";
import { HeroSection } from "./components/HeroSection";
import { IntegrationsSection } from "./components/IntegrationsSection";
import { LiveDemoSection } from "./components/LiveDemoSection";
import { PricingPreviewSection } from "./components/PricingPreviewSection";
import { ProblemOutcomeSection } from "./components/ProblemOutcomeSection";
import { ReliabilitySection } from "./components/ReliabilitySection";
import { TestimonialsSection } from "./components/TestimonialsSection";
import { VideoDemoSection } from "./components/VideoDemoSection";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <VideoDemoSection />
      <ProblemOutcomeSection />
      {/* <HowItWorksSection /> */}
      <FeaturesSection />
      <LiveDemoSection />
      {/* <IntegrationsSection /> */}
      {/* <PricingPreviewSection /> */}
      {/* <TestimonialsSection /> */}
      {/* <ReliabilitySection /> */}
      <CTASection />
    </>
  );
}
