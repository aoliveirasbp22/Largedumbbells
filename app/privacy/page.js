export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen font-sans" style={{ background: '#0a0a0a', color: '#ccc' }}>
      <div className="max-w-3xl mx-auto px-8 py-16">

        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-widest mb-2" style={{ color: '#B8935A' }}>
            LARGE DUMBBELLS
          </h1>
          <h2 className="text-xl font-semibold mb-1" style={{ color: '#e0e0e0' }}>Privacy Policy</h2>
          <p className="text-sm" style={{ color: '#555' }}>Last updated: May 12, 2026</p>
        </div>

        <div className="flex flex-col gap-10" style={{ lineHeight: '1.8' }}>

          <section>
            <h3 className="text-sm font-bold tracking-widest mb-3" style={{ color: '#B8935A' }}>1. INTRODUCTION</h3>
            <p className="text-sm" style={{ color: '#aaa' }}>
              Large Dumbbells LLC ("we," "our," or "us") is committed to protecting your personal information.
              This Privacy Policy explains how we collect, use, store, and protect information when you interact
              with our services, including our website, our Instagram and Facebook pages, and any forms or
              communications associated with the Busy Body Blueprint guide.
            </p>
            <p className="text-sm mt-3" style={{ color: '#aaa' }}>
              By submitting our form, messaging us on Instagram or Facebook, or otherwise engaging with our
              services, you agree to the practices described in this policy.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold tracking-widest mb-3" style={{ color: '#B8935A' }}>2. INFORMATION WE COLLECT</h3>
            <p className="text-sm mb-3" style={{ color: '#aaa' }}>We collect the following categories of information:</p>

            <p className="text-sm font-semibold mb-1" style={{ color: '#e0e0e0' }}>a) Information you provide directly</p>
            <ul className="text-sm mb-4 flex flex-col gap-1 pl-4" style={{ color: '#aaa', listStyleType: 'disc' }}>
              <li>Full name and email address</li>
              <li>Age</li>
              <li>Your biggest fitness struggle</li>
              <li>How bothered you are by your current situation (on a scale)</li>
              <li>Whether you would invest in a program if it was right for you</li>
              <li>Phone number (if provided through our lead management system)</li>
            </ul>

            <p className="text-sm font-semibold mb-1" style={{ color: '#e0e0e0' }}>b) Information from Instagram and Facebook</p>
            <ul className="text-sm mb-4 flex flex-col gap-1 pl-4" style={{ color: '#aaa', listStyleType: 'disc' }}>
              <li>Instagram and/or Facebook username (handle)</li>
              <li>Page-scoped user ID (PSID) assigned by Meta</li>
              <li>The content of direct messages you send to and receive from our account</li>
            </ul>

            <p className="text-sm font-semibold mb-1" style={{ color: '#e0e0e0' }}>c) Information collected automatically</p>
            <ul className="text-sm flex flex-col gap-1 pl-4" style={{ color: '#aaa', listStyleType: 'disc' }}>
              <li>Date and time of form submission or first contact</li>
              <li>Lead status and internal notes added by our team</li>
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-bold tracking-widest mb-3" style={{ color: '#B8935A' }}>3. HOW WE USE YOUR INFORMATION</h3>
            <p className="text-sm mb-3" style={{ color: '#aaa' }}>We use the information we collect to:</p>
            <ul className="text-sm flex flex-col gap-1 pl-4" style={{ color: '#aaa', listStyleType: 'disc' }}>
              <li>Deliver the Busy Body Blueprint guide to your email address</li>
              <li>Qualify you as a potential coaching client</li>
              <li>Communicate with you via Instagram or Facebook direct messages</li>
              <li>Contact you by phone to discuss our coaching programs</li>
              <li>Schedule and manage coaching consultations</li>
              <li>Maintain internal records of our communications with you</li>
              <li>Improve our outreach and qualification process</li>
            </ul>
            <p className="text-sm mt-3" style={{ color: '#aaa' }}>
              We do not use your information for automated decision-making or profiling beyond the
              internal lead qualification process described above.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold tracking-widest mb-3" style={{ color: '#B8935A' }}>4. META PLATFORM DATA</h3>
            <p className="text-sm" style={{ color: '#aaa' }}>
              We access Instagram and Facebook Messaging data through the Meta Platform APIs, specifically
              to send and receive direct messages with users who have initiated contact with our account.
              We access only the minimum data necessary to respond to your messages and manage our
              coaching inquiry process.
            </p>
            <p className="text-sm mt-3" style={{ color: '#aaa' }}>
              Message content and associated identifiers obtained via the Meta Platform are stored
              securely in our internal database and are used solely for the purpose of responding
              to your inquiry and managing our client pipeline. We do not share this data with
              third parties for advertising or marketing purposes.
            </p>
            <p className="text-sm mt-3" style={{ color: '#aaa' }}>
              Our use of Meta Platform data is governed by and compliant with the{' '}
              <a href="https://developers.facebook.com/policy/" target="_blank" rel="noopener noreferrer"
                style={{ color: '#B8935A', textDecoration: 'underline' }}>
                Meta Platform Policy
              </a>.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold tracking-widest mb-3" style={{ color: '#B8935A' }}>5. HOW WE STORE YOUR INFORMATION</h3>
            <p className="text-sm" style={{ color: '#aaa' }}>
              Your information is stored in a secure, access-controlled database (Supabase) hosted on
              infrastructure with industry-standard encryption at rest and in transit. Access to your
              data is restricted to authorized members of the Large Dumbbells LLC team only.
            </p>
            <p className="text-sm mt-3" style={{ color: '#aaa' }}>
              We retain your data for as long as necessary to provide our services or as required by
              applicable law. You may request deletion of your data at any time (see Section 7).
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold tracking-widest mb-3" style={{ color: '#B8935A' }}>6. SHARING YOUR INFORMATION</h3>
            <p className="text-sm mb-3" style={{ color: '#aaa' }}>
              We do not sell, rent, or trade your personal information. We may share your information
              only in the following limited circumstances:
            </p>
            <ul className="text-sm flex flex-col gap-1 pl-4" style={{ color: '#aaa', listStyleType: 'disc' }}>
              <li>
                <strong style={{ color: '#e0e0e0' }}>Service providers:</strong> We use GoHighLevel (GHL)
                as a CRM and communication platform, and Supabase for data storage. These providers
                process data on our behalf under appropriate data protection agreements.
              </li>
              <li>
                <strong style={{ color: '#e0e0e0' }}>Legal requirements:</strong> We may disclose your
                information if required to do so by law or in response to valid legal process.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-bold tracking-widest mb-3" style={{ color: '#B8935A' }}>7. YOUR RIGHTS</h3>
            <p className="text-sm mb-3" style={{ color: '#aaa' }}>You have the right to:</p>
            <ul className="text-sm flex flex-col gap-1 pl-4" style={{ color: '#aaa', listStyleType: 'disc' }}>
              <li>Request access to the personal information we hold about you</li>
              <li>Request correction of any inaccurate information</li>
              <li>Request deletion of your personal information</li>
              <li>Opt out of future communications from us at any time</li>
              <li>Withdraw consent to our use of your Instagram/Facebook messaging data</li>
            </ul>
            <p className="text-sm mt-3" style={{ color: '#aaa' }}>
              To exercise any of these rights, please contact us at{' '}
              <a href="mailto:kyle.briere@largedumbbells.com" style={{ color: '#B8935A' }}>
                kyle.briere@largedumbbells.com
              </a>.
              We will respond to all requests within 30 days.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold tracking-widest mb-3" style={{ color: '#B8935A' }}>8. COOKIES</h3>
            <p className="text-sm" style={{ color: '#aaa' }}>
              Our internal dashboard does not use tracking cookies or third-party analytics. Our
              public-facing form may use essential session cookies required for form submission only.
              We do not use cookies for advertising or behavioral tracking.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold tracking-widest mb-3" style={{ color: '#B8935A' }}>9. CHILDREN'S PRIVACY</h3>
            <p className="text-sm" style={{ color: '#aaa' }}>
              Our services are not directed at individuals under the age of 18. We do not knowingly
              collect personal information from minors. If you believe we have inadvertently collected
              information from a minor, please contact us immediately and we will delete it.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold tracking-widest mb-3" style={{ color: '#B8935A' }}>10. CHANGES TO THIS POLICY</h3>
            <p className="text-sm" style={{ color: '#aaa' }}>
              We may update this Privacy Policy from time to time. When we do, we will revise the
              "Last updated" date at the top of this page. We encourage you to review this policy
              periodically. Continued use of our services after any changes constitutes acceptance
              of the updated policy.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold tracking-widest mb-3" style={{ color: '#B8935A' }}>11. CONTACT US</h3>
            <p className="text-sm" style={{ color: '#aaa' }}>
              If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us:
            </p>
            <div className="mt-3 text-sm flex flex-col gap-1" style={{ color: '#aaa' }}>
              <p><span style={{ color: '#e0e0e0' }}>Large Dumbbells LLC</span></p>
              <p>Street Address</p>
              <p>City, CT, Postal Code</p>
              <p>United States</p>
              <p>
                <a href="mailto:kyle.briere@largedumbbells.com" style={{ color: '#B8935A' }}>
                  kyle.briere@largedumbbells.com
                </a>
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}