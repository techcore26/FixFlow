export function HeroWorkflowIllustration(){
  return <figure className="home-hero-flow" aria-labelledby="hero-flow-caption">
    <svg viewBox="0 0 1200 390" role="img" aria-hidden="true" className="home-hero-flow__svg">
      <defs>
        <linearGradient id="hero-peach" x1="0" x2="1"><stop stopColor="var(--pink)" stopOpacity=".34"/><stop offset="1" stopColor="#ffd39f" stopOpacity=".58"/></linearGradient>
        <linearGradient id="hero-lilac" x1="0" x2="1"><stop stopColor="#d9c9ff" stopOpacity=".78"/><stop offset="1" stopColor="#b39af1" stopOpacity=".5"/></linearGradient>
        <linearGradient id="hero-mint" x1="0" x2="1"><stop stopColor="#9be5c6" stopOpacity=".78"/><stop offset="1" stopColor="#d9f6e7" stopOpacity=".62"/></linearGradient>
      </defs>
      <path className="home-hero-flow__guide" d="M118 232H1070"/>
      <path className="home-hero-flow__progress" d="M145 232H1035"/>
      <g className="home-hero-flow__platform">
        <path d="M326 260 420 208h382l102 52-94 33H420Z" fill="url(#hero-lilac)"/>
        <path d="M420 293h390l94-33v27l-94 30H420Z" fill="#e9e1ff"/>
        <path d="M326 260 420 293v24l-94-30Z" fill="#c8b5f3"/>
      </g>
      <g className="home-hero-flow__intake">
        <path d="M153 245h116l-33-32h-116Z" fill="#e4dbff"/>
        <path d="M153 245v22h116v-22" fill="#cbbcf4"/>
        <rect x="190" y="122" width="96" height="95" rx="12" fill="#fff7f8" stroke="var(--ink-soft)"/>
        <path d="m238 144 22 42h-44Z" fill="url(#hero-peach)" stroke="var(--ink-soft)"/>
        <path d="M238 157v13m0 8h.1" stroke="var(--ink-soft)" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="145" cy="235" r="20" fill="#ffd699" stroke="var(--ink-soft)"/>
      </g>
      <g className="home-hero-flow__portal home-hero-flow__portal--investigate">
        <path d="M312 255V123l47-42v174Z" fill="url(#hero-mint)" stroke="var(--ink-soft)"/>
        <path d="M359 255V123l48-42v174Z" fill="#f7acd4" stroke="var(--ink-soft)"/>
        <path d="M359 123h48l-48-42h-47Z" fill="#c5f1dc" stroke="var(--ink-soft)"/>
        <path d="M331 235v-85h47v85Z" fill="#fffafc" stroke="var(--ink-soft)"/>
        <path d="M278 210h53m78 0h52" className="home-hero-flow__beam"/>
      </g>
      <g className="home-hero-flow__checkpoint">
        <path d="M466 232V82h278v150Z" fill="url(#hero-lilac)" stroke="var(--ink-soft)"/>
        <path d="M466 82 500 55h278l-34 27Z" fill="#ede5ff" stroke="var(--ink-soft)"/>
        <path d="M744 232V82l34-27v150Z" fill="#c8b7f0" stroke="var(--ink-soft)"/>
        {[0,1,2,3,4].map((index)=><path key={index} d={`M${503+index*47} 215v-70a19 19 0 0 1 38 0v70`} fill="#fffafc" stroke="var(--ink-soft)"/>)}
        <circle className="home-hero-flow__badge" cx="622" cy="54" r="28" fill="url(#hero-lilac)" stroke="var(--ink-soft)"/>
        <text x="622" y="63" textAnchor="middle" fill="white" fontFamily="Bricolage Grotesque Variable, sans-serif" fontSize="27" fontWeight="700">F</text>
        <g className="home-hero-flow__checkpoint-icons">
          <rect x="522" y="175" width="45" height="39" rx="8" fill="#fffafc" stroke="var(--ink-soft)"/><circle cx="544" cy="190" r="7" fill="none" stroke="var(--violet)" strokeWidth="2"/><path d="m550 196 8 8" stroke="var(--violet)" strokeWidth="2"/>
          <rect x="599" y="175" width="45" height="39" rx="8" fill="#fffafc" stroke="var(--ink-soft)"/><circle cx="621" cy="189" r="7" fill="none" stroke="var(--violet)" strokeWidth="2"/><path d="M609 204c2-8 22-8 24 0" fill="none" stroke="var(--violet)" strokeWidth="2"/>
          <rect x="676" y="175" width="45" height="39" rx="8" fill="#ecfff5" stroke="var(--ink-soft)"/><path d="m690 194 9 9 13-17" fill="none" stroke="var(--mint)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
      </g>
      <g className="home-hero-flow__portal home-hero-flow__portal--track">
        <path d="M816 255V113l48 42v100Z" fill="#f7acd4" stroke="var(--ink-soft)"/>
        <path d="M864 255V113l49 42v100Z" fill="url(#hero-peach)" stroke="var(--ink-soft)"/>
        <path d="M816 113h48l49 42h-49Z" fill="#ffd5e7" stroke="var(--ink-soft)"/>
        <path d="M835 235v-68h47v68Z" fill="#fffafc" stroke="var(--ink-soft)"/>
        <path d="M913 210h63" className="home-hero-flow__beam"/>
      </g>
      <g className="home-hero-flow__resolution">
        <path d="M944 233h145l-54-44h-91Z" fill="url(#hero-peach)" stroke="var(--ink-soft)"/>
        <path d="M944 233v25h145v-25" fill="#f3abd2" stroke="var(--ink-soft)"/>
        <path d="M986 189v-47h36v47" fill="#ffd49f" stroke="var(--ink-soft)"/>
        <path d="m1055 258 30-31 34 31" fill="#a8e5c9" stroke="var(--ink-soft)"/>
      </g>
      <g className="home-hero-flow__accents">
        <circle cx="112" cy="164" r="9" fill="#f1a1c2" stroke="var(--ink-soft)"/>
        <path d="M293 102h22v20h-22z" fill="#d5c4ff" stroke="var(--ink-soft)"/>
        <path d="m1080 125 33 19-33 19z" fill="#ffd49f" stroke="var(--ink-soft)"/>
        <circle cx="928" cy="278" r="21" fill="#ffe0b1" stroke="var(--ink-soft)"/>
        <rect x="408" y="264" width="19" height="35" rx="5" fill="#f2a9c7" stroke="var(--ink-soft)"/>
      </g>
    </svg>
    <figcaption id="hero-flow-caption" className="sr-only">Illustrative workflow map: an incident moves through investigation, human approval, and recorded tracking. It is not live operational data.</figcaption>
    <p className="home-hero-flow__caption mono">Illustrative workflow map · not live operational data</p>
  </figure>;
}

export function HeroWorkflowCards(){
  return <section className="home-hero-cards" aria-label="Illustrative workflow stages">
    <article className="home-hero-card home-hero-card--investigate">
      <header><p className="home-hero-card__eyebrow mono">01 · Illustrative panel</p><h2 className="serif">Investigate</h2><p>Review context, record manual evidence, and propose a bounded action.</p></header>
      <div className="home-mini-investigation" aria-hidden="true">
        <span className="home-mini-investigation__device"><i/><i/><i/><b/></span>
        <div className="home-mini-investigation__steps">
          <div><span>⌕</span><p>Review incident context</p></div>
          <div><span>▤</span><p>Record evidence</p></div>
          <div><span>◇</span><p>Summarize findings</p></div>
          <div><span>▧</span><p>Propose bounded action</p></div>
        </div>
      </div>
    </article>
    <article className="home-hero-card home-hero-card--approve">
      <header><p className="home-hero-card__eyebrow mono">02 · Illustrative panel</p><h2 className="serif">Approve</h2><p>A human decision reviews the proposed action before any tracked change.</p></header>
      <div className="home-mini-approval" aria-hidden="true">
        <span className="home-mini-approval__profile"><i/></span>
        <div className="home-mini-approval__sheet">
          <div><b>Proposed action</b><span>Record a bounded remediation</span></div>
          <div><b>Scope and impact</b><span>Review before decision</span></div>
          <div className="home-mini-approval__review"><b>Human approval</b><span>Required</span></div>
          <footer><span>✓ Approve</span><span>× Reject</span></footer>
        </div>
      </div>
    </article>
    <article className="home-hero-card home-hero-card--track">
      <header><p className="home-hero-card__eyebrow mono">03 · Illustrative panel</p><h2 className="serif">Track</h2><p>Keep a durable audit trail with outcomes recorded only when available.</p></header>
      <div className="home-mini-track" aria-hidden="true">
        <span className="home-mini-track__records"><i/><i/><i/></span>
        <div className="home-mini-track__timeline">
          <div className="is-complete"><i/><p><b>Incident recorded</b><span>Immutable event</span></p></div>
          <div className="is-complete"><i/><p><b>Findings recorded</b><span>Manual investigation</span></p></div>
          <div className="is-pending"><i/><p><b>Decision pending</b><span>Human review required</span></p></div>
          <div><i/><p><b>Outcome recorded</b><span>When available</span></p></div>
        </div>
      </div>
    </article>
  </section>;
}
