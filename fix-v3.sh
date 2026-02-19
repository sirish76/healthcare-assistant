#!/bin/bash
# ==============================================================
# Fix script v3 - Add Google Sign-In to Landing Page
# Run from project root: bash fix-v3.sh
# ==============================================================

set -e
FE="healthcare-assistant-frontend/src"

echo "========================================="
echo "  Fix v3: Google Sign-In on Landing Page"
echo "========================================="

echo "=== 1. Update LandingPage.jsx with Google Sign-In ==="
cat > "$FE/components/LandingPage.jsx" << 'JSXEOF'
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Phone,
  Mail,
  Menu,
  X,
  Heart,
  Shield,
  Brain,
  Plane,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Users,
  Stethoscope,
  Activity,
  Clock,
  MapPin,
  Globe,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  LogIn,
  LogOut,
  User,
} from 'lucide-react';

/* ─────────────────── colour tokens ─────────────────── */
const BRAND = {
  primary: '#1B3A5C',
  accent: '#2AA89A',
  accentLight: '#E6F7F5',
  warm: '#F9A826',
  warmLight: '#FFF8EB',
  bg: '#FAFBFD',
  card: '#FFFFFF',
  text: '#1E293B',
  muted: '#64748B',
  border: '#E2E8F0',
};

export default function LandingPage({ onOpenChat, onOpenContact }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeService, setActiveService] = useState(0);
  const [activeFaq, setActiveFaq] = useState(null);
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  return (
    <div className="font-sans antialiased" style={{ backgroundColor: BRAND.bg, color: BRAND.text }}>
      <Navbar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} onOpenChat={onOpenChat} onOpenContact={onOpenContact} />
      <HeroSection onOpenContact={onOpenContact} onOpenChat={onOpenChat} />
      <WellbeingSection />
      <ServicesSection active={activeService} setActive={setActiveService} />
      <AdvantageSection />
      <AIChatSection onOpenChat={onOpenChat} />
      <TestimonialsSection idx={testimonialIdx} setIdx={setTestimonialIdx} />
      <BlogSection />
      <FAQSection active={activeFaq} setActive={setActiveFaq} />
      <Footer />
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   USER MENU (sign-in / signed-in state)
   ════════════════════════════════════════════════════════ */
function UserMenu({ scrolled, isMobile = false }) {
  const { user, signIn, signOut, loading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignIn = async () => {
    try {
      setSigningIn(true);
      await signIn();
    } catch (err) {
      console.error('Sign-in failed:', err);
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) return null;

  if (user) {
    return (
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
            isMobile
              ? 'text-gray-700 hover:bg-gray-100 w-full'
              : scrolled
                ? 'text-gray-700 hover:bg-gray-100'
                : 'text-white/90 hover:bg-white/10'
          }`}
        >
          {user.pictureUrl ? (
            <img src={user.pictureUrl} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <User size={18} />
          )}
          <span className="text-sm font-medium truncate max-w-[120px]">
            {user.name || user.email}
          </span>
          <ChevronDown size={14} />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <button
                onClick={() => { setMenuOpen(false); signOut(); }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={signingIn}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
        isMobile
          ? 'text-gray-700 hover:bg-gray-100 w-full justify-center border border-gray-200'
          : scrolled
            ? 'text-gray-700 hover:bg-gray-100 border border-gray-200'
            : 'text-white border border-white/30 hover:bg-white/10'
      } ${signingIn ? 'opacity-50 cursor-wait' : ''}`}
    >
      {signingIn ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg width="16" height="16" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
      )}
      {signingIn ? 'Signing in...' : 'Sign in with Google'}
    </button>
  );
}

/* ════════════════════════════════════════════════════════
   NAVBAR
   ════════════════════════════════════════════════════════ */
function Navbar({ mobileMenuOpen, setMobileMenuOpen, onOpenChat, onOpenContact }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const links = [
    { label: 'Home', href: '#home' },
    { label: 'About Us', href: '#about' },
    { label: 'Services', href: '#services' },
    { label: 'AI Assistant', href: '#ai-chat' },
    { label: 'Blogs', href: '#blogs' },
    { label: 'Contact Us', href: '#contact' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}
    >
      {/* Top bar */}
      <div className="hidden md:block border-b" style={{ borderColor: scrolled ? BRAND.border : 'rgba(255,255,255,0.15)' }}>
        <div className="max-w-7xl mx-auto px-6 py-2 flex justify-between text-xs">
          <div className="flex items-center gap-6">
            <a href="tel:4089826644" className={`flex items-center gap-1.5 hover:opacity-80 ${scrolled ? 'text-gray-600' : 'text-white/80'}`}>
              <Phone size={12} /> (408) 982-6644
            </a>
            <a href="mailto:zumanely0@gmail.com" className={`flex items-center gap-1.5 hover:opacity-80 ${scrolled ? 'text-gray-600' : 'text-white/80'}`}>
              <Mail size={12} /> zumanely0@gmail.com
            </a>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <a href="#home" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.primary})` }}>
            <Heart size={20} className="text-white" />
          </div>
          <div>
            <span className={`text-lg font-bold tracking-tight ${scrolled ? '' : 'text-white'}`} style={scrolled ? { color: BRAND.primary } : {}}>
              Zumanely
            </span>
            <p className={`text-[10px] leading-tight ${scrolled ? 'text-gray-500' : 'text-white/70'}`}>
              Holistic Wellness Solutions
            </p>
          </div>
        </a>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                scrolled
                  ? 'text-gray-700 hover:text-teal-700 hover:bg-teal-50'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
              }`}
            >
              {l.label}
            </a>
          ))}
          <UserMenu scrolled={scrolled} />
          <button
            onClick={onOpenContact}
            className="ml-3 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
            style={{ background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.primary})` }}
          >
            FREE Consultation
          </button>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 rounded-lg hover:bg-white/10">
          {mobileMenuOpen ? <X size={24} className={scrolled ? 'text-gray-700' : 'text-white'} /> : <Menu size={24} className={scrolled ? 'text-gray-700' : 'text-white'} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white shadow-xl border-t border-gray-100 animate-fade-in">
          <div className="px-6 py-4 space-y-1">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-lg text-gray-700 hover:bg-teal-50 hover:text-teal-700 font-medium text-sm"
              >
                {l.label}
              </a>
            ))}
            <div className="pt-3 border-t border-gray-100">
              <UserMenu scrolled={true} isMobile={true} />
            </div>
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenContact(); }}
              className="w-full mt-3 px-5 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.primary})` }}
            >
              FREE Consultation
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ════════════════════════════════════════════════════════
   HERO
   ════════════════════════════════════════════════════════ */
function HeroSection({ onOpenContact, onOpenChat }) {
  const { user } = useAuth();

  return (
    <section
      id="home"
      className="relative min-h-[92vh] flex items-center overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${BRAND.primary} 0%, #0F2B47 40%, ${BRAND.accent} 100%)` }}
    >
      {/* Decorative circles */}
      <div className="absolute top-20 right-10 w-72 h-72 rounded-full opacity-10" style={{ background: BRAND.accent }} />
      <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full opacity-5" style={{ background: BRAND.warm }} />
      <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04] -translate-x-1/2 -translate-y-1/2 border-2 border-white" />

      <div className="relative max-w-7xl mx-auto px-6 py-32 grid lg:grid-cols-2 gap-12 items-center">
        <div className="text-white">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-sm mb-6 border border-white/10">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            Rated 9.9/10 By Caregivers, Patients & Families
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Discovering
            <span className="block" style={{ color: BRAND.accent }}>Holistic Wellness</span>
            Solutions
          </h1>

          <p className="text-lg text-white/75 leading-relaxed mb-8 max-w-xl">
            Experience holistic home health care designed to support your complete well-being.
            Zumanely blends advanced technology with human connection to deliver personalized,
            empathetic care and guidance for your physical, emotional, and mental health.
          </p>

          {/* Welcome message for signed-in users */}
          {user && (
            <div className="mb-6 flex items-center gap-3 px-5 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 max-w-fit">
              {user.pictureUrl && (
                <img src={user.pictureUrl} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
              )}
              <div>
                <p className="text-sm text-white/90">Welcome back, <span className="font-semibold">{user.name || 'there'}</span>!</p>
                <p className="text-xs text-white/60">Your conversations are saved automatically.</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <button
              onClick={onOpenChat}
              className="px-8 py-4 rounded-xl text-base font-semibold shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 flex items-center gap-2"
              style={{ background: `linear-gradient(135deg, ${BRAND.accent}, #1B8A7E)`, color: 'white' }}
            >
              <MessageSquare size={20} />
              {user ? 'Continue Chatting' : 'Chat with AI Assistant'}
            </button>
            <button
              onClick={onOpenContact}
              className="px-8 py-4 rounded-xl text-base font-semibold border-2 border-white/30 text-white hover:bg-white/10 transition-all"
            >
              FREE Consultation
            </button>
          </div>
        </div>

        {/* Right side decorative card */}
        <div className="hidden lg:block relative">
          <div className="relative bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: <Stethoscope size={24} />, label: 'Complex Care', count: '500+' },
                { icon: <Brain size={24} />, label: 'Stress Management', count: '1200+' },
                { icon: <Heart size={24} />, label: 'Personal Health', count: '800+' },
                { icon: <Plane size={24} />, label: 'Visitor Care', count: '300+' },
              ].map((item, i) => (
                <div key={i} className="bg-white/10 rounded-2xl p-5 text-center backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all">
                  <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: `${BRAND.accent}30` }}>
                    <span style={{ color: BRAND.accent }}>{item.icon}</span>
                  </div>
                  <p className="text-white font-bold text-xl">{item.count}</p>
                  <p className="text-white/60 text-xs mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   WELL-BEING JOURNEY
   ════════════════════════════════════════════════════════ */
function WellbeingSection() {
  const cards = [
    {
      num: '1',
      title: 'Self Employed',
      desc: 'Zumanely is proud to serve all the hardworking entrepreneurs and self-employed individuals, supporting their growth as they navigate the unique challenges of self-employment including emotional, behavioral, and physical well-being.',
      icon: <Activity size={28} />,
      color: '#2AA89A',
    },
    {
      num: '2',
      title: 'Unemployed',
      desc: 'Unemployment can lead to issues such as depression and anxiety, significantly impacting mental health and well-being. Zumanely offers counseling services to help address these issues, providing support for those struggling with emotional and psychological concerns.',
      icon: <Users size={28} />,
      color: '#1B3A5C',
    },
    {
      num: '3',
      title: 'Care Givers',
      desc: 'Caregivers often experience trauma as part of their responsibilities, facing immense stress and needing guidance to provide proper care for loved ones while also seeking emotional and behavioral well-being.',
      icon: <Heart size={28} />,
      color: '#F9A826',
    },
    {
      num: '4',
      title: 'Visitors',
      desc: 'If your loved ones or friends are visiting and need guidance or emotional support, Zumanely provides resources to help them navigate care, ensuring they receive the right assistance with compassion and ease.',
      icon: <Plane size={28} />,
      color: '#E84D70',
    },
  ];

  return (
    <section id="about" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: BRAND.accent }}>
            Who We Serve
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: BRAND.primary }}>
            Well-being and Wellness Journey for All
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Zumanely empowers caregivers, seniors, individuals, and families with accessible holistic
            home care that feels truly personal.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((c, i) => (
            <div
              key={i}
              className="group relative bg-white rounded-2xl p-7 border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <span className="absolute -top-4 -right-2 text-[80px] font-black opacity-[0.04]" style={{ color: c.color }}>
                {c.num}
              </span>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                style={{ background: `${c.color}15`, color: c.color }}
              >
                {c.icon}
              </div>
              <h3 className="text-lg font-bold mb-3" style={{ color: BRAND.primary }}>
                {c.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   SERVICES
   ════════════════════════════════════════════════════════ */
function ServicesSection({ active, setActive }) {
  const services = [
    {
      title: 'Complex Care',
      icon: <Stethoscope size={24} />,
      desc: 'Comprehensive care management for individuals with complex medical needs, chronic conditions, and multi-system health challenges. Our holistic health care providers coordinate across specialists to ensure seamless, compassionate care.',
    },
    {
      title: 'Stress Management',
      icon: <Brain size={24} />,
      desc: 'Evidence-based stress management programs combining mindfulness, counseling, and lifestyle coaching. We help you build resilience, manage anxiety, and develop sustainable wellness habits for long-term mental health.',
    },
    {
      title: 'Personal Health',
      icon: <Heart size={24} />,
      desc: 'Personalized health and wellness programs tailored to your unique needs. From nutrition coaching and fitness guidance to preventive care planning, we support your journey to optimal physical well-being.',
    },
    {
      title: 'Visitor Care',
      icon: <Plane size={24} />,
      desc: 'Specialized care navigation for visitors and their families. We help international visitors access healthcare services, understand insurance options, and receive quality medical attention during their stay.',
    },
  ];

  return (
    <section id="services" className="py-24 px-6" style={{ background: `linear-gradient(180deg, ${BRAND.accentLight} 0%, white 100%)` }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: BRAND.accent }}>
            What We Offer
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: BRAND.primary }}>
            Our Services
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Holistic wellness and well-being solutions for diverse lifestyles, supported by care coordination,
            care management, and patient advocacy.
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-5">
          {services.map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`text-left rounded-2xl p-7 border-2 transition-all duration-300 ${
                active === i
                  ? 'bg-white shadow-xl border-teal-200 -translate-y-1'
                  : 'bg-white/60 border-transparent hover:bg-white hover:shadow-md'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all ${
                  active === i ? 'scale-110' : ''
                }`}
                style={{
                  background: active === i ? BRAND.accent : `${BRAND.accent}15`,
                  color: active === i ? 'white' : BRAND.accent,
                }}
              >
                {s.icon}
              </div>
              <h3 className="text-lg font-bold mb-3" style={{ color: BRAND.primary }}>
                {s.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              <div
                className={`mt-4 flex items-center gap-1 text-sm font-semibold transition-opacity ${
                  active === i ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ color: BRAND.accent }}
              >
                Learn more <ArrowRight size={14} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   ADVANTAGE
   ════════════════════════════════════════════════════════ */
function AdvantageSection() {
  const advantages = [
    {
      title: 'Digital Care Service',
      desc: 'Zumanely leverages teleconferencing technology and provides a seamless experience to its clients and patients.',
      icon: <Globe size={24} />,
    },
    {
      title: 'Care for Everyone',
      desc: 'Our mission is to help people live healthier, happier lives by ensuring everyone feels their best — including self-employed & unemployed individuals.',
      icon: <Users size={24} />,
    },
    {
      title: 'Holistic Approach',
      desc: 'We connect clients with external services such as nutrition coaching, fitness training, transportation for seniors, grocery delivery, and adult care.',
      icon: <Heart size={24} />,
    },
    {
      title: 'Wide Area Coverage',
      desc: 'We partner with a huge network of providers across the nation with different specialists, connecting clients with the right medical professional.',
      icon: <MapPin size={24} />,
    },
  ];

  return (
    <section className="py-24 px-6" style={{ background: BRAND.primary }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: BRAND.accent }}>
            Why Choose Us
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Zumanely Advantage: Holistic Care, Anytime, Anywhere
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            Through structured case management and coordinated care pathways, we simplify medical and wellness
            processes so you can focus on healing and growth.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {advantages.map((a, i) => (
            <div
              key={i}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-7 border border-white/10 hover:bg-white/15 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: `${BRAND.accent}30` }}>
                <span style={{ color: BRAND.accent }}>{a.icon}</span>
              </div>
              <h3 className="text-white font-bold text-lg mb-3">{a.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   AI CHAT ASSISTANT SECTION
   ════════════════════════════════════════════════════════ */
function AIChatSection({ onOpenChat }) {
  return (
    <section id="ai-chat" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${BRAND.primary}, #0F2B47)` }}>
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: BRAND.accent }} />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-5" style={{ background: BRAND.warm }} />

          <div className="relative grid lg:grid-cols-2 gap-12 p-10 md:p-16 items-center">
            <div className="text-white">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-sm mb-6">
                <Sparkles size={14} style={{ color: BRAND.warm }} />
                AI-Powered
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Meet Your Personal
                <span className="block" style={{ color: BRAND.accent }}>Health Assistant</span>
              </h2>
              <p className="text-white/70 leading-relaxed mb-8">
                Our AI-powered HealthAssist chatbot is available 24/7 to answer your healthcare
                questions, explain insurance plans, help you find doctors, and guide you through
                Medicare and Medicaid options — all with compassionate, easy-to-understand responses.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  'Ask about Medicare, Medicaid & insurance plans',
                  'Find doctors accepting your insurance',
                  'Understand deductibles, copays & coverage',
                  'Get personalized healthcare guidance',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 size={18} style={{ color: BRAND.accent }} />
                    <span className="text-white/80 text-sm">{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={onOpenChat}
                className="px-8 py-4 rounded-xl text-base font-semibold shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 flex items-center gap-3"
                style={{ background: `linear-gradient(135deg, ${BRAND.accent}, #1B8A7E)`, color: 'white' }}
              >
                <MessageSquare size={20} />
                Chat with AI Assistant
              </button>
            </div>

            {/* Chat preview mockup */}
            <div className="hidden lg:block">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${BRAND.accentLight}, white)` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.primary})` }}>
                    <Sparkles size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: BRAND.primary }}>HealthAssist AI</p>
                    <p className="text-xs text-gray-500">Online • Ready to help</p>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.primary})` }}>
                      <Sparkles size={12} className="text-white" />
                    </div>
                    <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-700">
                      Hello! I'm your healthcare assistant. How can I help you today?
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <div className="rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white" style={{ background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.primary})` }}>
                      Can you explain Medicare Part A vs Part B?
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.primary})` }}>
                      <Sparkles size={12} className="text-white" />
                    </div>
                    <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-700">
                      <p className="font-semibold mb-1">Great question! Here's a quick breakdown:</p>
                      <p><strong>Part A</strong> covers hospital stays, skilled nursing, and hospice care...</p>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                    <span className="text-gray-400 text-sm flex-1">Ask about healthcare, insurance...</span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.primary})` }}>
                      <ArrowRight size={14} className="text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   TESTIMONIALS
   ════════════════════════════════════════════════════════ */
function TestimonialsSection({ idx, setIdx }) {
  const testimonials = [
    {
      name: 'Sarah L.',
      role: 'Caregiver',
      text: "Zumanely has been a game-changer for me as a caregiver. The emotional support and expert guidance helped me navigate my loved one's health journey with confidence. I finally feel like I have a reliable support system!",
      rating: 5,
    },
    {
      name: 'David R.',
      role: 'Entrepreneur',
      text: "Being self-employed, I struggled to find reliable healthcare resources. Zumanely made it easy to access expert medical advice, fitness coaching, and even mental health support—all in one place. It's truly a holistic solution!",
      rating: 5,
    },
    {
      name: 'Mark T.',
      role: 'Job Seeker',
      text: 'Losing my job was stressful enough, and navigating healthcare felt overwhelming. Zumanely connected me with the right professionals and support services, making the process smooth and stress-free. I feel cared for and empowered.',
      rating: 5,
    },
  ];

  const next = () => setIdx((idx + 1) % testimonials.length);
  const prev = () => setIdx((idx - 1 + testimonials.length) % testimonials.length);

  return (
    <section className="py-24 px-6" style={{ background: BRAND.warmLight }}>
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: BRAND.accent }}>
          Testimonials
        </p>
        <h2 className="text-3xl md:text-4xl font-bold mb-12" style={{ color: BRAND.primary }}>
          Real Stories, Real Impact
        </h2>

        <div className="relative">
          <div className="bg-white rounded-3xl p-10 shadow-xl border border-gray-100">
            <div className="flex justify-center gap-1 mb-6">
              {Array.from({ length: testimonials[idx].rating }).map((_, i) => (
                <Star key={i} size={20} className="fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <blockquote className="text-lg text-gray-700 leading-relaxed mb-8 italic max-w-2xl mx-auto">
              "{testimonials[idx].text}"
            </blockquote>
            <p className="font-bold text-lg" style={{ color: BRAND.primary }}>{testimonials[idx].name}</p>
            <p className="text-sm text-gray-500">{testimonials[idx].role}</p>
          </div>

          <div className="flex justify-center gap-3 mt-8">
            <button onClick={prev} className="w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center hover:shadow-lg transition-all" style={{ color: BRAND.primary }}>
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              {testimonials.map((_, i) => (
                <span
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${i === idx ? 'w-8' : ''}`}
                  style={{ background: i === idx ? BRAND.accent : '#CBD5E1' }}
                />
              ))}
            </div>
            <button onClick={next} className="w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center hover:shadow-lg transition-all" style={{ color: BRAND.primary }}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   BLOG
   ════════════════════════════════════════════════════════ */
function BlogSection() {
  const blogs = [
    { title: "What Happens If You Don't Pay Medical Bills? (Complete Guide)", date: 'December 31, 2025', tag: 'Insurance' },
    { title: 'Travel Insurance With Pre-Existing Conditions: What to Know', date: 'December 24, 2025', tag: 'Travel' },
    { title: 'AEP Medicare: What Is the Medicare Annual Enrollment Period?', date: 'December 18, 2025', tag: 'Medicare' },
  ];

  return (
    <section id="blogs" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: BRAND.accent }}>
            Resources
          </p>
          <h2 className="text-3xl md:text-4xl font-bold" style={{ color: BRAND.primary }}>
            Latest Blogs
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {blogs.map((b, i) => (
            <div key={i} className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="h-48 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${BRAND.accentLight}, ${BRAND.warmLight})` }}>
                <Stethoscope size={48} style={{ color: `${BRAND.accent}40` }} />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: BRAND.accentLight, color: BRAND.accent }}>
                    {b.tag}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={11} /> {b.date}
                  </span>
                </div>
                <h3 className="font-bold mb-2 group-hover:text-teal-700 transition-colors" style={{ color: BRAND.primary }}>
                  {b.title}
                </h3>
                <a href="#" className="text-sm font-semibold flex items-center gap-1 mt-3" style={{ color: BRAND.accent }}>
                  Read More <ArrowRight size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   FAQ
   ════════════════════════════════════════════════════════ */
function FAQSection({ active, setActive }) {
  const faqs = [
    { q: "Who can use Zumanely's services?", a: 'Zumanely is designed for everyone — caregivers, patients, self-employed individuals, unemployed individuals, and visitors. We believe in accessible and compassionate care for all.' },
    { q: 'How does Zumanely provide support for caregivers?', a: 'We understand the challenges caregivers face, which is why we offer emotional support, access to specialized healthcare professionals, and essential services such as nutrition coaching, fitness training, and transportation for seniors.' },
    { q: 'Do I need insurance to use Zumanely?', a: 'No, Zumanely is accessible to everyone, regardless of insurance coverage. We focus on making healthcare guidance and support available to all individuals, including those without traditional health plans.' },
    { q: 'How does Zumanely connect users with healthcare professionals?', a: 'We partner with a vast network of providers, therapists, and wellness experts across the nation. Based on your specific needs, we match you with the right medical professional for personalized care.' },
    { q: 'How do I get started with Zumanely?', a: "Getting started is easy! Simply click on the FREE Consultation button, share your needs, and we'll connect you with the right professionals and resources to support your well-being." },
  ];

  return (
    <section className="py-24 px-6" style={{ background: BRAND.accentLight }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: BRAND.accent }}>
            FAQ
          </p>
          <h2 className="text-3xl md:text-4xl font-bold" style={{ color: BRAND.primary }}>
            Got Questions? We've Got Answers!
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div
              key={i}
              className={`bg-white rounded-2xl border transition-all duration-300 ${
                active === i ? 'border-teal-200 shadow-lg' : 'border-gray-100'
              }`}
            >
              <button
                onClick={() => setActive(active === i ? null : i)}
                className="w-full flex items-center justify-between px-7 py-5 text-left"
              >
                <span className="font-semibold pr-4" style={{ color: BRAND.primary }}>{f.q}</span>
                <ChevronDown
                  size={20}
                  className={`shrink-0 transition-transform duration-300 ${active === i ? 'rotate-180' : ''}`}
                  style={{ color: BRAND.accent }}
                />
              </button>
              {active === i && (
                <div className="px-7 pb-5 text-sm text-gray-500 leading-relaxed animate-fade-in">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   FOOTER
   ════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer id="contact" style={{ background: BRAND.primary }}>
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-white text-center md:text-left">
            <h3 className="text-2xl font-bold mb-1">Compassionate Care, Anytime, Anywhere</h3>
            <p className="text-white/60">Get holistic home health care tailored to your needs.</p>
          </div>
          <a
            href="#ai-chat"
            className="px-8 py-4 rounded-xl text-base font-semibold shadow-xl hover:shadow-2xl transition-all whitespace-nowrap"
            style={{ background: `linear-gradient(135deg, ${BRAND.accent}, #1B8A7E)`, color: 'white' }}
          >
            FREE Consultation
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${BRAND.accent}30` }}>
              <Heart size={20} style={{ color: BRAND.accent }} />
            </div>
            <span className="text-white text-lg font-bold">Zumanely</span>
          </div>
          <p className="text-white/50 text-sm leading-relaxed mb-5">
            Compassionate Care, Tailored Support, Powered by AI
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-5">Quick Links</h4>
          <div className="space-y-3 text-sm">
            {['Home', 'About Us', 'Services', 'Blogs', 'Contact Us'].map((l) => (
              <a key={l} href="#" className="block text-white/50 hover:text-white transition-colors">{l}</a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-5">Services</h4>
          <div className="space-y-3 text-sm">
            {['Complex Care', 'Stress Management', 'Personal Health', 'Visitor Care'].map((l) => (
              <a key={l} href="#" className="block text-white/50 hover:text-white transition-colors">{l}</a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-5">Contact Information</h4>
          <div className="space-y-3 text-sm text-white/50">
            <a href="tel:4089826644" className="flex items-center gap-2 hover:text-white transition-colors">
              <Phone size={14} /> (408) 982-6644
            </a>
            <a href="mailto:zumanely0@gmail.com" className="flex items-center gap-2 hover:text-white transition-colors">
              <Mail size={14} /> zumanely0@gmail.com
            </a>
            <p className="flex items-start gap-2">
              <MapPin size={14} className="shrink-0 mt-0.5" />
              41079 Bernie St, Fremont, CA 94539
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 text-center text-xs text-white/40">
          Copyright 2025 Zumanely. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}
JSXEOF

echo "=== Done! ==="
echo "Now rebuild the frontend:"
echo "  docker compose build frontend --no-cache"
echo "  docker compose up -d frontend"

