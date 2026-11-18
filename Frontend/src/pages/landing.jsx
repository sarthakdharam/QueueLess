import { useState } from "react";
import { Link } from "react-router-dom";
import { Localized } from "../i18n.jsx";
import Brand from "../components/Brand.jsx";

export default function Landing() {
  const [videoMuted, setVideoMuted] = useState(true);
  return (
    <Localized>
      <main className="landing">
        <header className="topbar">
          <Brand />
          <nav>
            <a href="#how-it-works">How it works</a>
            <a href="#for-clinics">For clinics</a>
            <Link to="/clinics">Book an appointment</Link>
            <Link to="/patient/recover">My Appointment</Link>
            <Link className="nav-login" to="/login">
              Clinic login
            </Link>
            <Link className="button button-dark button-small" to="/register">
              Register clinic <span>↗</span>
            </Link>
          </nav>
        </header>
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot" /> A calmer way to care
            </div>
            <h1>
              Less waiting.
              <br />
              <em>More caring.</em>
            </h1>
            <p className="hero-description">
              A clearer queue for your clinic. Patients know where they stand,
              and your team stays in control.
            </p>
            <div className="hero-actions">
              <Link className="button button-dark" to="/clinics">
                Book an appointment <span>↗</span>
              </Link>
              <Link className="text-link" to="/patient/recover">
                My Appointment <span>↗</span>
              </Link>
            </div>
            <div className="hero-proof">
              <div className="proof-avatars">
                <span>R</span>
                <span>A</span>
                <span>M</span>
              </div>
              <p>
                Made for independent clinics
                <br />
                <strong>Across India</strong>
              </p>
            </div>
          </div>
          <div className="hero-video-card">
            <video
              className="hero-video"
              autoPlay
              loop
              muted={videoMuted}
              playsInline
              preload="metadata"
            >
              <source src="/videos/queueless-hero.mp4" type="video/mp4" />
            </video>
            <div className="hero-video-shade" />
            <button
              type="button"
              className="hero-video-sound"
              onClick={() => setVideoMuted((muted) => !muted)}
              aria-label={
                videoMuted ? "Turn video sound on" : "Turn video sound off"
              }
              aria-pressed={!videoMuted}
            >
              {videoMuted ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 10v4h4l5 4V6L8 10H4Z" />
                  <path d="m17 10 4 4m0-4-4 4" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 10v4h4l5 4V6L8 10H4Z" />
                  <path d="M16 9.5a4 4 0 0 1 0 5m2-7.5a7 7 0 0 1 0 10" />
                </svg>
              )}
            </button>
          </div>
          <span className="hero-orbit orbit-one" />
          <span className="hero-orbit orbit-two" />
          <span className="hero-star">✳</span>
        </section>
        <section className="trust-strip">
          <span>BUILT FOR THE PEOPLE WHO KEEP CLINICS MOVING</span>
          <div>
            <span>Independent clinics</span>
            <b>·</b>
            <span>Reception teams</span>
            <b>·</b>
            <span>Patients on the go</span>
          </div>
        </section>
        <section className="landing-benefits" id="for-patients">
          <div className="landing-section-heading">
            <div>
              <div className="eyebrow">ONE SIMPLE VIEW, ALL DAY</div>
              <h2>Everything you need for a calmer clinic visit.</h2>
            </div>
            <p>
              QueueLess keeps patients informed and gives clinic teams one clear
              place to manage the day.
            </p>
          </div>
          <div className="benefit-grid">
            <article className="benefit-card">
              <span className="benefit-icon" aria-hidden="true">
                ⌁
              </span>
              <h3>Live queue updates</h3>
              <p>
                Patients can check their place in line without calling the
                reception desk.
              </p>
            </article>
            <article className="benefit-card">
              <span className="benefit-icon" aria-hidden="true">
                ◷
              </span>
              <h3>Appointments and walk-ins</h3>
              <p>
                Bring scheduled visits and same-day registrations together in
                one working queue.
              </p>
            </article>
            <article className="benefit-card">
              <span className="benefit-icon" aria-hidden="true">
                ✦
              </span>
              <h3>Clear next steps</h3>
              <p>
                Give every patient a private link, a token, and simple guidance
                for their visit.
              </p>
            </article>
          </div>
        </section>
        <section className="landing-audience">
          <article className="audience-card patient-audience">
            <div className="eyebrow">FOR PATIENTS</div>
            <h2>Spend less time waiting at the clinic.</h2>
            <p>
              Book a visit, save your private appointment link, and return when
              your place in the queue is getting close.
            </p>
            <Link className="text-link" to="/clinics">
              Find a clinic <span>↗</span>
            </Link>
          </article>
          <article className="audience-card clinic-audience">
            <div className="eyebrow">FOR CLINICS</div>
            <h2>Give your reception team a clearer day.</h2>
            <p>
              Register walk-ins, call the next patient, track consultations, and
              keep your queue moving from one dashboard.
            </p>
            <Link className="text-link" to="/register">
              Set up your clinic <span>↗</span>
            </Link>
          </article>
        </section>
        <section className="steps-section" id="how-it-works">
          <div>
            <div className="eyebrow">A BETTER VISIT, STEP BY STEP</div>
            <h2>
              Good care starts
              <br />
              before the consult.
            </h2>
          </div>
          <div className="step-list">
            <article>
              <span>01</span>
              <div>
                <h3>Know where you stand</h3>
                <p>
                  Patients get a token and a live view of their place in line.
                </p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <h3>Wait on your terms</h3>
                <p>
                  Come back when your turn is getting close, with clear
                  guidance.
                </p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <h3>Keep the day flowing</h3>
                <p>
                  Your team manages walk-ins and appointments from one simple
                  queue.
                </p>
              </div>
            </article>
          </div>
        </section>
        <section className="cta-section" id="for-clinics">
          <div>
            <div className="eyebrow">YOUR CLINIC, IN BETTER FLOW</div>
            <h2>
              Make room for
              <br />
              what matters.
            </h2>
            <p>
              Set up your clinic and start a one-month free trial. No payment
              details needed to begin.
            </p>
          </div>
          <Link className="button button-light" to="/register">
            Create your clinic <span>↗</span>
          </Link>
        </section>
        <footer>
          <Brand />
          <span>© 2026 QueueLess · Thoughtful queues, better visits.</span>
          <div>
            <a href="mailto:hello@queueless.in">Contact</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </footer>
      </main>
    </Localized>
  );
}
