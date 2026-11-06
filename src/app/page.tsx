import { HeroWorkflowCards, HeroWorkflowIllustration } from "@/components/home/hero-workflow-preview";
import { ProductShowcase } from "@/components/home/product-showcase";
import { WorkflowSteps } from "@/components/home/workflow-steps";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { PrismLink } from "@/components/ui/prism-button";

export default function Home(){
  return <><MarketingHeader/><main>
    <section className="home-hero page-wrap">
      <p className="home-hero__pill mono">Incident management · human approved</p>
      <HeroWorkflowIllustration/>
      <div className="home-hero__editorial reveal">
        <h1>From <span className="serif">incident</span> to resolution.</h1>
        <div className="home-hero__support">
          <p className="home-hero__lede">A luminous, accountable workspace for software incidents—built for human decisions and durable records.</p>
          <div className="home-hero__actions"><PrismLink href="/dashboard">Open live workspace <span aria-hidden>→</span></PrismLink><PrismLink href="/demo" secondary>Guided judge tour</PrismLink></div>
          <div className="home-hero__proof"><span><i className="bg-emerald-400"/>Local-first</span><span><i className="bg-violet-400"/>Human-controlled</span><span><i className="bg-sky-400"/>Audit-ready</span></div>
        </div>
      </div>
      <HeroWorkflowCards/>
    </section>
    <div className="home-marquee" aria-hidden="true"><div><span>Detect</span><em>Investigate</em><span>Review</span><em>Resolve</em><span>Audit</span><em>Learn</em><span>Detect</span><em>Investigate</em></div></div>
    <section id="how" className="page-wrap home-section home-section--workflow"><div className="grid items-end gap-8 lg:grid-cols-[1fr_.75fr]"><div><p className="eyebrow">One workflow · zero ambiguity</p><h2 className="mt-5 text-5xl font-semibold leading-[.94] tracking-[-.06em] sm:text-7xl">A clear path through <span className="serif prism-text">every incident.</span></h2></div><p className="max-w-xl text-base leading-7 text-[var(--muted)] lg:justify-self-end">Four explicit stages carry each incident from first report to a closed, reviewable record—without hiding decisions behind automation.</p></div><WorkflowSteps/></section>
    <section className="page-wrap home-section home-section--showcase"><ProductShowcase/></section>
    <section className="page-wrap pb-28"><div className="home-cta prism-border"><div><p className="eyebrow">Ready when the next signal arrives</p><h2 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1] tracking-[-.055em] sm:text-6xl">Turn response into a practice your team can <span className="serif prism-text">trust.</span></h2><p className="mt-5 text-[var(--muted)]">Start locally. Keep humans in control. Leave a complete trail.</p></div><div className="mt-8 flex flex-wrap gap-3"><PrismLink href="/incidents">Create an incident →</PrismLink><PrismLink href="/architecture" secondary>See how it works</PrismLink></div></div></section>
  </main><footer className="border-t border-white/70 py-8"><div className="page-wrap flex flex-wrap justify-between gap-4 text-xs text-[var(--muted)]"><span>FixFlow · Local incident workflow</span><span>Switch Gateway is not connected</span></div></footer></>;
}
