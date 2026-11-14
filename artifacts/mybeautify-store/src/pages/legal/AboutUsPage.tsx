import { useEffect } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Gem,
  Crown,
  ShieldCheck,
  Shirt,
  HeartHandshake,
  Award,
} from 'lucide-react';
import { SiteLayout } from '@/layouts/SiteLayout';
import { useSiteContent } from '@/hooks/use-site-content';
import './about-us.css';

export default function AboutUsPage() {
  const { aboutUs } = useSiteContent();

  // Smooth scroll to top on mount and set SEO meta tags
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'About Us | MALKAZ — Where Luxury Meets Trust';

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      'content',
      'Discover MALKAZ under Zainab Khan Enterprises — where royal luxury jewellery meets trust. Explore our story, brand manifesto, and premium collections.'
    );
  }, []);

  return (
    <SiteLayout>
      <main className="malkaz-about-page" id="main-about">
        {/* Navigation Breadcrumb / Back Link */}
        <div className="malkaz-about-back-wrap">
          <Link href="/" className="malkaz-about-back-link" data-testid="about-back-home">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to MALKAZ Home
          </Link>
        </div>

        {/* 1. HERO BANNER */}
        <section className="malkaz-about-hero" aria-labelledby="about-hero-title">
          <div className="malkaz-about-hero-content">
            <div className="malkaz-about-hero-badge">
              <Sparkles size={14} aria-hidden="true" />
              <span>Zainab Khan Enterprises</span>
            </div>
            <h1 id="about-hero-title" className="malkaz-about-hero-title">
              {aboutUs.heroTitle || 'About MALKAZ'}
            </h1>
            <p className="malkaz-about-hero-subtitle">{aboutUs.heroSubtitle || 'Where Luxury Meets Trust'}</p>
            <div className="malkaz-about-ornament" aria-hidden="true">
              ◆ ❖ ◆
            </div>
            <p className="malkaz-about-hero-desc">
              {aboutUs.brandIntro || (
                <>
                  Founded under <strong>Zainab Khan Enterprises</strong>, <strong>MALKAZ</strong> represents
                  the pinnacle of royal luxury jewellery and timeless design aesthetics. Guided by founder
                  Zainab Khan’s extensive 7+ years of experience in the fashion and styling industry, MALKAZ
                  was established to bridge the gap between regal grandeur and accessible, uncompromising craft.
                </>
              )}
            </p>
            <div className="malkaz-about-founder-tag">
              <Crown size={15} aria-hidden="true" />
              <span>
                {aboutUs.founderTag || (
                  <>
                    Founder &amp; Creative Director: <strong>Zainab Khan</strong> · 7+ Years Fashion Industry Experience
                  </>
                )}
              </span>
            </div>
          </div>
        </section>

        <div className="malkaz-about-container">
          {/* 2. CUSTOMER SATISFACTION & TRUST CALLOUT */}
          <section className="malkaz-about-trust-callout" aria-labelledby="trust-callout-title">
            <div className="malkaz-trust-grid">
              <div className="malkaz-trust-header">
                <p className="eyebrow">OUR CORE ETHOS</p>
                <h2 id="trust-callout-title" className="malkaz-trust-title">
                  {aboutUs.qualityTitle || 'Quality Over Quantity'}
                </h2>
                <p className="malkaz-trust-copy">
                  {aboutUs.qualityBody || (
                    <>
                      At MALKAZ, customer satisfaction is not merely a benchmark—it is our crowning commitment.
                      Every piece that carries our seal is meticulously inspected to uphold royal standards of
                      durability, shine, and comfort. We believe in complete transparency and honor every promise
                      we make to our patrons.
                    </>
                  )}
                </p>
                <p className="malkaz-trust-copy">
                  Learn more about our shipping commitments, exchange policies, and service standards in our{' '}
                  <Link href="/terms" data-testid="about-link-terms">
                    Terms &amp; Conditions
                  </Link>{' '}
                  and review how we protect your personal information in our{' '}
                  <Link href="/privacy" data-testid="about-link-privacy">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>

              <div className="malkaz-trust-pillars">
                <div className="malkaz-trust-pillar-card">
                  <div className="malkaz-trust-pillar-icon" aria-hidden="true">
                    <Gem size={20} />
                  </div>
                  <div className="malkaz-trust-pillar-text">
                    <h4>Artisanal Excellence</h4>
                    <p>Hand-curated stones, lustrous pearls, and precision micro-inlays crafted for enduring radiance.</p>
                  </div>
                </div>

                <div className="malkaz-trust-pillar-card">
                  <div className="malkaz-trust-pillar-icon" aria-hidden="true">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="malkaz-trust-pillar-text">
                    <h4>Skin-Friendly Luxury</h4>
                    <p>Hypoallergenic, lead-free and nickel-free brass and alloy compositions designed for long wear.</p>
                  </div>
                </div>

                <div className="malkaz-trust-pillar-card">
                  <div className="malkaz-trust-pillar-icon" aria-hidden="true">
                    <HeartHandshake size={20} />
                  </div>
                  <div className="malkaz-trust-pillar-text">
                    <h4>Transparent Guarantees</h4>
                    <p>Pan-India insured express delivery, real-time tracking, and dedicated customer support.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. DISCOVER OUR PREMIUM COLLECTIONS (3-Column Grid) */}
          <section className="malkaz-about-collections-section" aria-labelledby="collections-title">
            <div className="malkaz-section-header">
              <p className="malkaz-section-eyebrow">CURATED GRANDEUR</p>
              <h2 id="collections-title" className="malkaz-section-title">
                Discover Our Premium Collections
              </h2>
              <p className="malkaz-section-desc">
                From grand royal celebrations to subtle everyday statement pieces, explore jewellery and
                accessories thoughtfully curated to celebrate your individuality.
              </p>
            </div>

            <div className="malkaz-collections-grid">
              {/* Card 1: Premium Imitation Jewellery */}
              <article className="malkaz-collection-card">
                <div className="malkaz-collection-card-icon-wrap" aria-hidden="true">
                  <Gem size={26} />
                </div>
                <h3 className="malkaz-collection-card-title">Premium Imitation Jewellery</h3>
                <p className="malkaz-collection-card-desc">
                  Majestic bridal chokers, layered polki rani haars, emerald-studded necklace sets, delicate
                  solitaire chains, and festive jhumkas—each reflecting heirloom royalty at accessible luxury.
                </p>
                <Link href="/shop" className="malkaz-collection-card-link" data-testid="explore-jewellery-btn">
                  Explore Jewellery <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </article>

              {/* Card 2: Exclusive Hair Accessories */}
              <article className="malkaz-collection-card">
                <div className="malkaz-collection-card-icon-wrap" aria-hidden="true">
                  <Sparkles size={26} />
                </div>
                <h3 className="malkaz-collection-card-title">Exclusive Hair Accessories</h3>
                <p className="malkaz-collection-card-desc">
                  Artfully designed embellished hairbands, pearl-encrusted clips, bridal hair vines, and velvet
                  accessories that crown your hairstyle with effortless grace across modern and traditional looks.
                </p>
                <Link href="/shop" className="malkaz-collection-card-link" data-testid="explore-hair-btn">
                  Explore Hair Accessories <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </article>

              {/* Card 3: Women's Fashion Clothing */}
              <article className="malkaz-collection-card">
                <span className="malkaz-about-badge-soon">Coming Soon</span>
                <div className="malkaz-collection-card-icon-wrap" aria-hidden="true">
                  <Shirt size={26} />
                </div>
                <h3 className="malkaz-collection-card-title">Women's Fashion Clothing</h3>
                <p className="malkaz-collection-card-desc">
                  An upcoming bespoke pret-a-porter apparel line featuring royal silhouettes, rich handloom
                  textures, and modern festive ensembles tailored for the contemporary Indian woman.
                </p>
                <span className="malkaz-collection-card-link" style={{ opacity: 0.75, cursor: 'default' }}>
                  Preview Arriving Soon <ArrowRight size={15} aria-hidden="true" />
                </span>
              </article>
            </div>
          </section>

          {/* 4. THE STORY BEHIND THE NAME MALKAZ */}
          <section className="malkaz-story-section" aria-labelledby="story-title">
            <div className="malkaz-story-grid">
              <div className="malkaz-story-imagery">
                <div className="malkaz-story-imagery-emblem" aria-hidden="true">
                  <Crown size={56} />
                </div>
                <blockquote className="malkaz-story-imagery-quote">
                  {aboutUs.storyQuote ? `“${aboutUs.storyQuote.replace(/^[“"]+|[”"]+$/g, '')}”` : '“A mother’s dignity is a daughter’s eternal crown.”'}
                </blockquote>
                <p className="malkaz-story-imagery-sub">Zainab Khan · Founder</p>
              </div>

              <div className="malkaz-story-text-content">
                <p className="eyebrow">AN HEIRLOOM LEGACY</p>
                <h2 id="story-title">{aboutUs.storyTitle || 'The Story Behind the Name Malkaz'}</h2>
                <p>
                  {aboutUs.storyBody || (
                    <>
                      The name <strong>MALKAZ</strong> carries an intimate, deeply emotional legacy. It is born
                      from a heartfelt tribute honoring founder Zainab Khan’s beloved mother, <strong>Malka</strong>—a
                      matriarch revered for her quiet resilience, regal grace, and unconditional warmth—alongside the
                      unwavering guidance and lifelong companionship of her elder sister.
                    </>
                  )}
                </p>
                <p>
                  In Urdu and Arabic heritage, <em>“Malka”</em> translates directly to <strong>Queen</strong>—the
                  sovereign of dignity, wisdom, and inner strength. By blending this maternal heritage with Zainab's
                  artistic passion and styling experience, MALKAZ became more than an e-commerce brand; it became an
                  emblem of female resilience, royal identity, and familial pride passed through generations.
                </p>
                <p>
                  Every jewel chosen, designed, and presented under the MALKAZ insignia carries forward this spirit:
                  an invitation for every woman to embrace her rightful sovereignty and wear her confidence like a crown.
                </p>
              </div>
            </div>
          </section>

          {/* 5. A MISSION TO EMPOWER WOMEN */}
          <section className="malkaz-mission-section" aria-labelledby="mission-title">
            <div className="malkaz-mission-card">
              <div className="malkaz-mission-header">
                <p className="eyebrow">OUR IMPACT &amp; VISION</p>
                <h2 id="mission-title">{aboutUs.missionTitle || 'More Than a Brand – A Mission to Empower Women'}</h2>
                <p>
                  {aboutUs.missionDesc || 'MALKAZ stands firmly for female elevation, economic self-reliance, and the timeless artistry of Indian craftswomen and karigars.'}
                </p>
              </div>

              <div className="malkaz-mission-pillars-grid">
                <div className="malkaz-mission-pillar">
                  <Award size={24} style={{ color: '#D4AF37', marginBottom: 12 }} aria-hidden="true" />
                  <h4>Sovereign Confidence</h4>
                  <p>
                    Inspiring women from all walks of life to walk into every room with unshakeable poise,
                    dignity, and pride in their personal heritage.
                  </p>
                </div>

                <div className="malkaz-mission-pillar">
                  <Gem size={24} style={{ color: '#D4AF37', marginBottom: 12 }} aria-hidden="true" />
                  <h4>Artisanal Heritage</h4>
                  <p>
                    Supporting indigenous craftsmen, local karigars, and women artisans whose intricate
                    handwork brings each MALKAZ creation to life.
                  </p>
                </div>

                <div className="malkaz-mission-pillar">
                  <Sparkles size={24} style={{ color: '#D4AF37', marginBottom: 12 }} aria-hidden="true" />
                  <h4>Empowered Community</h4>
                  <p>
                    Fostering economic opportunities and styling mentorship for young women stepping into the
                    creative, entrepreneurial, and fashion workforce.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 6. WHO IS MALKA? (SIGNATURE MANIFESTO) */}
          <section className="malkaz-manifesto-section" aria-labelledby="manifesto-title">
            <div className="malkaz-manifesto-card">
              <div className="malkaz-manifesto-crown" aria-hidden="true">
                <Crown size={48} />
              </div>
              <p className="eyebrow" style={{ color: '#9A7B2C', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>
                SIGNATURE BRAND MANIFESTO
              </p>
              <h2 id="manifesto-title" className="malkaz-manifesto-title">
                {aboutUs.manifestoTitle || 'Who Is Malka?'}
              </h2>
              <p className="malkaz-manifesto-body">
                {aboutUs.manifestoBody || (
                  <>
                    She is not defined by fleeting trends or external validation. She is bold yet gentle, ambitious
                    yet grounded, traditional yet forward-looking. She wears her values with pride, leads with purpose,
                    and turns everyday challenges into stepping stones of grace.
                  </>
                )}
              </p>

              <div className="malkaz-manifesto-gold-box">
                <h3 className="malkaz-manifesto-tagline">
                  {aboutUs.tagline || 'MALKAZ – SHE IS HER OWN CROWN.'}
                </h3>
                <p className="malkaz-manifesto-subtagline">
                  {aboutUs.subtagline || 'She Can Shine Her Own Way.'}
                </p>
              </div>

              <Link href="/shop" className="malkaz-manifesto-cta" data-testid="manifesto-shop-btn">
                <span>Explore Collections</span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      </main>
    </SiteLayout>
  );
}
