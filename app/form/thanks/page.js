// app/form/thanks/page.js
//
// Post-form-submit landing page. Re-sells the offer, builds desire,
// pushes toward booking the strategy call.

export const metadata = {
  title: "Large Dumbbells — Stop Guessing",
}

export default function FormThanks() {
  return (
    <>
      <style>{`
        :root{--gold:#A07845;--gold-light:#C99E6A;--black:#080808;--dark:#111111;--card:#161616;--white:#FFFFFF;--gray:#888888;--light-gray:#CCCCCC;--red:#C0392B;}
        *{margin:0;padding:0;box-sizing:border-box;}
        html{scroll-behavior:smooth;}
        body{background:var(--black);color:var(--white);font-family:'DM Sans',sans-serif;min-height:100vh;overflow-x:hidden;}
        .gold-bar{width:100%;height:4px;background:linear-gradient(90deg,transparent,var(--gold),var(--gold-light),var(--gold),transparent);}
        nav{display:flex;align-items:center;justify-content:center;padding:20px 40px;border-bottom:1px solid rgba(160,120,69,0.1);}
        .logo{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:4px;color:var(--gold);}
        .hero{display:flex;flex-direction:column;align-items:center;text-align:center;padding:70px 24px 50px;position:relative;}
        .hero::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:700px;height:500px;background:radial-gradient(ellipse at center,rgba(160,120,69,0.07) 0%,transparent 70%);pointer-events:none;}
        .pain-tag{display:inline-flex;align-items:center;gap:8px;background:rgba(192,57,43,0.1);border:1px solid rgba(192,57,43,0.3);border-radius:100px;padding:7px 18px;font-size:12px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;color:#E74C3C;margin-bottom:28px;animation:fadeUp 0.5s ease both;}
        .pain-dot{width:7px;height:7px;border-radius:50%;background:#E74C3C;animation:pulse 1.5s infinite;}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.7)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(48px,9vw,88px);line-height:0.95;letter-spacing:1px;margin-bottom:20px;animation:fadeUp 0.5s ease 0.1s both;}
        h1 .gold{color:var(--gold);}
        .hero-sub{font-size:clamp(16px,2.5vw,20px);color:var(--light-gray);font-weight:300;line-height:1.6;max-width:540px;margin-bottom:36px;animation:fadeUp 0.5s ease 0.2s both;}
        .hero-sub strong{color:var(--white);font-weight:600;}
        .btn-primary{display:inline-flex;align-items:center;gap:12px;background:var(--gold);color:var(--black);font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:20px 52px;border:none;cursor:pointer;text-decoration:none;transition:all 0.3s;animation:fadeUp 0.5s ease 0.3s both;}
        .btn-primary:hover{background:var(--gold-light);transform:translateY(-2px);box-shadow:0 20px 50px rgba(160,120,69,0.35);}
        .btn-note{font-size:13px;color:var(--gray);margin-top:14px;animation:fadeUp 0.5s ease 0.4s both;}
        .pain-section{background:var(--dark);border-top:1px solid rgba(160,120,69,0.08);border-bottom:1px solid rgba(160,120,69,0.08);padding:64px 24px;}
        .pain-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:2px;max-width:900px;margin:0 auto;}
        .pain-card{background:var(--card);padding:32px 28px;position:relative;overflow:hidden;}
        .pain-card::before{content:'';position:absolute;top:0;left:0;width:100%;height:3px;background:var(--red);opacity:0.7;}
        .pain-card.fix::before{background:var(--gold);}
        .pain-icon{font-size:28px;margin-bottom:14px;}
        .pain-label{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--red);margin-bottom:8px;font-weight:500;}
        .pain-label.fix-label{color:var(--gold);}
        .pain-title{font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--white);margin-bottom:8px;}
        .pain-desc{font-size:13px;color:var(--light-gray);line-height:1.7;font-weight:300;}
        .section{max-width:860px;margin:0 auto;padding:72px 24px;}
        .section-label{font-size:11px;font-weight:500;color:var(--gold);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;}
        .section-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,5vw,54px);line-height:1;margin-bottom:40px;}
        .section-title .gold{color:var(--gold);}
        .quote-section{background:var(--dark);border-top:1px solid rgba(160,120,69,0.08);padding:64px 24px;}
        .quote-inner{max-width:700px;margin:0 auto;text-align:center;}
        .quote-mark{font-family:'Bebas Neue',sans-serif;font-size:80px;color:rgba(160,120,69,0.1);line-height:0.8;margin-bottom:16px;}
        .quote-text{font-size:18px;color:var(--white);line-height:1.8;font-weight:300;font-style:italic;margin-bottom:20px;}
        .quote-author{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);}
        .result-pill{display:inline-flex;align-items:center;gap:16px;background:rgba(160,120,69,0.08);border:1px solid rgba(160,120,69,0.2);padding:16px 28px;margin-top:32px;}
        .result-num{font-family:'Bebas Neue',sans-serif;font-size:42px;color:var(--gold);line-height:1;}
        .result-label{font-size:13px;color:var(--light-gray);line-height:1.5;}
        .video-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:12px;}
        .video-wrap{background:var(--card);padding:4px;}
        .video-wrap iframe{display:block;width:100%;height:420px;border:none;}
        .video-label{padding:12px 14px;font-size:12px;color:var(--gray);letter-spacing:1px;}
        .final-cta{text-align:center;padding:80px 24px 100px;position:relative;border-top:1px solid rgba(160,120,69,0.08);}
        .final-cta::before{content:'';position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:600px;height:300px;background:radial-gradient(ellipse at center bottom,rgba(160,120,69,0.06) 0%,transparent 70%);pointer-events:none;}
        .final-cta h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(42px,7vw,72px);line-height:1;margin-bottom:16px;}
        .final-cta p{font-size:16px;color:var(--gray);max-width:420px;margin:0 auto 36px;line-height:1.7;font-weight:300;}
        .scarcity{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--gray);margin-top:18px;}
        .scarcity-dot{width:8px;height:8px;border-radius:50%;background:#E74C3C;animation:pulse 1.5s infinite;}
        footer{border-top:1px solid rgba(255,255,255,0.05);padding:28px 24px;text-align:center;}
        .footer-logo{font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:4px;color:var(--gold);margin-bottom:8px;}
        .footer-copy{font-size:12px;color:rgba(255,255,255,0.15);}
        @media(max-width:600px){.hero{padding:50px 24px 40px;}.btn-primary{padding:18px 32px;font-size:14px;width:100%;justify-content:center;}.video-wrap iframe{height:280px;}nav{padding:18px 24px;}}
      `}</style>

      <link
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />

      <div className="gold-bar" />
      <nav>
        <div className="logo">Large Dumbbells</div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="pain-tag">
          <span className="pain-dot" />
          Sound familiar?
        </div>
        <h1>
          You Don't Know<br />
          <span className="gold">Where To Start.</span><br />
          You Don't Have<br />
          The Time.
        </h1>
        <p className="hero-sub">
          <strong>Stop guessing.</strong> I build everything for you — your workouts, your meals,
          your grocery list — all custom to your life. You just show up and execute.
        </p>
        <a
          href="https://calendly.com/kyle-briere-largedumbbells/30"
          className="btn-primary"
          target="_blank"
          rel="noopener noreferrer"
        >
          Book Your Free Strategy Call
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M4 10H16M16 10L11 5M16 10L11 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
        <p className="btn-note">20 minutes. No pressure. No obligation.</p>
      </section>

      {/* PAIN + FIX GRID */}
      <section className="pain-section">
        <div className="pain-grid">
          <div className="pain-card">
            <div className="pain-icon">😤</div>
            <div className="pain-label">The problem</div>
            <div className="pain-title">No Time To Figure It Out</div>
            <p className="pain-desc">
              You're working 50+ hours a week. By the time you finish, the last thing you want to do
              is research macros and build a workout plan.
            </p>
          </div>
          <div className="pain-card fix">
            <div className="pain-icon">✅</div>
            <div className="pain-label fix-label">The fix</div>
            <div className="pain-title">I Do It All For You</div>
            <p className="pain-desc">
              Custom meal plan, grocery list, and workout split — all built before your first
              session. You show up and execute. That's it.
            </p>
          </div>
          <div className="pain-card">
            <div className="pain-icon">🔄</div>
            <div className="pain-label">The problem</div>
            <div className="pain-title">Always Starting Over</div>
            <p className="pain-desc">
              You start strong, miss a week, and feel like you're back to zero. The cycle repeats
              every few months and nothing sticks.
            </p>
          </div>
          <div className="pain-card fix">
            <div className="pain-icon">📋</div>
            <div className="pain-label fix-label">The fix</div>
            <div className="pain-title">Structure That Sticks</div>
            <p className="pain-desc">
              Weekly check-ins, Sunday syncs, and 24/7 access to me. When life happens the plan
              adjusts — you never have to start over.
            </p>
          </div>
          <div className="pain-card">
            <div className="pain-icon">❓</div>
            <div className="pain-label">The problem</div>
            <div className="pain-title">No Idea What To Eat</div>
            <p className="pain-desc">
              You're guessing at every meal. One day under eating, the next over it. Nothing is
              consistent and nothing is working.
            </p>
          </div>
          <div className="pain-card fix">
            <div className="pain-icon">🛒</div>
            <div className="pain-label fix-label">The fix</div>
            <div className="pain-title">Your Grocery List. Every Week.</div>
            <p className="pain-desc">
              Built around foods you actually like. Exact quantities, exact macros. You shop in 20
              minutes and never guess again.
            </p>
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section className="quote-section">
        <div className="quote-inner">
          <div className="section-label" style={{ textAlign: 'center', marginBottom: 12 }}>
            What clients say
          </div>
          <div className="quote-mark">&ldquo;</div>
          <p className="quote-text">
            The plan makes it so I don't have to make any decision except to execute. Food, warmup,
            workout — all sorted out. There is only one decision. Lock in or don't.
          </p>
          <div className="quote-author">Dave — Defense Tech, 50+ hrs/week</div>
          <div className="result-pill">
            <div>
              <div className="result-num">-4.6</div>
            </div>
            <div className="result-label">
              lbs lost<br />
              <span style={{ color: 'var(--gold)' }}>in 2 weeks</span>
            </div>
            <div
              style={{
                width: 1,
                height: 40,
                background: 'rgba(160,120,69,0.2)',
                margin: '0 8px',
              }}
            />
            <div>
              <div className="result-num">45</div>
            </div>
            <div className="result-label">
              lbs lost<br />
              <span style={{ color: 'var(--gold)' }}>by Dave</span>
            </div>
          </div>
        </div>
      </section>

      {/* VIDEO TESTIMONIALS */}
      <section className="section">
        <div className="section-label">Client results</div>
        <h2 className="section-title">
          Real People.<br />
          <span className="gold">Real Results.</span>
        </h2>
        <div className="video-grid">
          <div className="video-wrap">
            <iframe
              src="https://drive.google.com/file/d/1mCa3TPoA5kNYz3UdWGpLkt6gZxB5uYAO/preview"
              allowFullScreen
              allow="autoplay"
              title="Client result video 1"
            />
            <div className="video-label">CLIENT RESULT</div>
          </div>
          <div className="video-wrap">
            <iframe
              src="https://drive.google.com/file/d/1vDKyirymC-pCsG-AVjXV9fm1dNjmrSoo/preview"
              allowFullScreen
              allow="autoplay"
              title="Client result video 2"
            />
            <div className="video-label">CLIENT RESULT</div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta">
        <div
          className="section-label"
          style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}
        >
          Ready to stop guessing?
        </div>
        <h2>
          One Call.<br />
          <span style={{ color: 'var(--gold)' }}>Everything Changes.</span>
        </h2>
        <p>
          20 minutes with Kyle. He'll look at your goals, your schedule, and tell you exactly what
          it takes to get there.
        </p>
        <a
          href="https://calendly.com/kyle-briere-largedumbbells/30"
          className="btn-primary"
          target="_blank"
          rel="noopener noreferrer"
        >
          Apply for a Spot
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M4 10H16M16 10L11 5M16 10L11 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
        <div className="scarcity">
          <span className="scarcity-dot" />
          Limited spots available this month
        </div>
      </section>

      <footer>
        <div className="footer-logo">Large Dumbbells</div>
        <div className="footer-copy">© 2026 Large Dumbbells · Kyle Briere · All rights reserved</div>
      </footer>
    </>
  )
}