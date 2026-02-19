import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Phone,
  Mail,
  Menu,
  X,
  Heart,
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

/* ─────────────────── demo conversations ─────────────────── */
const DEMO_CONVERSATIONS = [
  {
    label: 'Medicare',
    messages: [
      { role: 'user', text: "What's the difference between Medicare Part A and Part B?" },
      { role: 'assistant', text: "Great question! **Part A** covers hospital stays, skilled nursing, and hospice care — most people don't pay a premium. **Part B** covers doctor visits, outpatient services, and preventive care with a monthly premium of $174.70." },
      { role: 'user', text: "Do I need to sign up or is it automatic?" },
      { role: 'assistant', text: "If you're receiving Social Security, you'll be **automatically enrolled** at 65. Otherwise, sign up during your Initial Enrollment Period — the 7-month window around your 65th birthday." },
    ],
  },
  {
    label: 'Doctors',
    messages: [
      { role: 'user', text: "I need a cardiologist in Fremont who accepts Blue Shield PPO" },
      { role: 'assistant', text: "I found **3 top-rated cardiologists** near Fremont:\n\n🏥 Dr. Anita Patel — 4.9★ — Washington Hospital\n🏥 Dr. James Chen — 4.8★ — Fremont Medical\n🏥 Dr. Sanjay Gupta — 4.7★ — Kaiser" },
      { role: 'user', text: "Can you book with Dr. Patel?" },
      { role: 'assistant', text: "Dr. Patel has availability:\n\n📅 **Wed Feb 19** — 10:00 AM, 2:30 PM\n📅 **Thu Feb 20** — 9:00 AM, 11:15 AM\n\nWhich time works best?" },
    ],
  },
  {
    label: 'Caregivers',
    messages: [
      { role: 'user', text: "I'm caring for my mom with dementia and feeling burned out" },
      { role: 'assistant', text: "I understand — caregiving for a loved one with dementia is incredibly demanding. You're not alone. Let me help with some options:" },
      { role: 'user', text: "What support is available?" },
      { role: 'assistant', text: "There's quite a bit:\n\n💚 **Respite care** — temporary relief so you can rest\n💚 **Support groups** — local caregiver communities\n💚 **Counseling** — caregiver-focused sessions\n💚 **Home health aides** — covered by Medicaid\n\nWant me to find resources near Fremont?" },
    ],
  },
  {
    label: 'Visitors',
    messages: [
      { role: 'user', text: "My parents are visiting from India for 6 months. Insurance options?" },
      { role: 'assistant', text: "Visitors aren't eligible for Medicare/Medicaid, but good options exist:\n\n🛡️ **Visitor insurance** — $50-150/month\n🛡️ **Travel medical** — emergency coverage\n🛡️ **Marketplace plans** — with legal status" },
      { role: 'user', text: "Which covers pre-existing conditions?" },
      { role: 'assistant', text: "Most plans have a **6-12 month exclusion period**. However, **INS Visitor Care** covers acute onset of pre-existing conditions after a waiting period. Want me to compare plans for your parents?" },
    ],
  },
];

/* ─────────────────── animation styles ─────────────────── */
const animationStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Playfair+Display:wght@400;500;600;700&display=swap');

  .font-display { font-family: 'Playfair Display', Georgia, serif; }
  .font-body { font-family: 'DM Sans', system-ui, sans-serif; }

  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(40px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-40px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-12px); }
  }
  @keyframes pulse-ring {
    0% { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(1.4); opacity: 0; }
  }
  @keyframes card-enter {
    from { opacity: 0; transform: translateY(20px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes typing-dot {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-4px); opacity: 1; }
  }
  @keyframes msg-appear {
    from { opacity: 0; transform: translateY(12px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes cursor-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  .animate-fade-in-up { animation: fadeInUp 0.7s ease-out both; }
  .animate-fade-in { animation: fadeIn 0.6s ease-out both; }
  .animate-slide-right { animation: slideInRight 0.7s ease-out both; }
  .animate-slide-left { animation: slideInLeft 0.7s ease-out both; }
  .animate-float { animation: float 6s ease-in-out infinite; }
  .animate-card-enter { animation: card-enter 0.5s ease-out both; }
  .animate-msg-appear { animation: msg-appear 0.4s ease-out both; }
  .typing-dot { animation: typing-dot 1.4s ease-in-out infinite; }
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

  .delay-100 { animation-delay: 0.1s; }
  .delay-200 { animation-delay: 0.2s; }
  .delay-300 { animation-delay: 0.3s; }
  .delay-400 { animation-delay: 0.4s; }
  .delay-500 { animation-delay: 0.5s; }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

/* ─────────────────── Animated Chat Demo ─────────────────── */
function TypingIndicator({ compact }) {
  return (
    <div className="flex items-center gap-1.5 px-1 py-1">
      {[0,1,2].map(i => <div key={i} className="typing-dot rounded-full" style={{width:compact?5:6,height:compact?5:6,background:BRAND.accent}}/>)}
    </div>
  );
}

function ChatMessage({ role, text, isTyping, typedText, compact }) {
  const isUser = role === 'user';
  const display = isTyping ? typedText : text;
  const render = (t) => {
    if (!t) return null;
    return t.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g).map((p, j) =>
        p.startsWith('**') && p.endsWith('**') ? <strong key={j} style={{color:isUser?'white':BRAND.primary}}>{p.slice(2,-2)}</strong> : p
      );
      return <span key={i}>{i>0&&<br/>}{parts}</span>;
    });
  };
  return (
    <div className={`flex gap-2 ${isUser?'justify-end':'justify-start'} animate-msg-appear`}>
      {!isUser && <div className={`${compact?'w-6 h-6':'w-7 h-7'} rounded-lg flex items-center justify-center shrink-0 mt-0.5`} style={{background:`linear-gradient(135deg,${BRAND.accent},${BRAND.primary})`}}><Sparkles size={compact?10:12} className="text-white"/></div>}
      <div className={`${compact?'max-w-[85%] px-3 py-2 text-xs':'max-w-[80%] px-4 py-3 text-sm'} rounded-2xl leading-relaxed ${isUser?'rounded-tr-md text-white':'rounded-tl-md bg-gray-50 text-gray-600'}`} style={isUser?{background:`linear-gradient(135deg,${BRAND.accent},${BRAND.primary})`}:{}}>
        {render(display)}
        {isTyping && <span className="inline-block w-0.5 h-3.5 ml-0.5 align-middle" style={{background:isUser?'white':BRAND.accent,animation:'cursor-blink 0.8s ease-in-out infinite'}}/>}
      </div>
    </div>
  );
}

function AnimatedChatDemo({ variant = 'full', className = '' }) {
  const [convoIdx, setConvoIdx] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typedText, setTypedText] = useState('');
  const messagesEndRef = useRef(null);
  const timeoutsRef = useRef([]);
  const typingRef = useRef(null);
  const mountedRef = useRef(true);
  const compact = variant === 'compact';
  const currentConvo = DEMO_CONVERSATIONS[convoIdx];

  const clearTimeouts = useCallback(() => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; clearTimeout(typingRef.current); }, []);
  const addTimeout = useCallback((fn, ms) => { const id = setTimeout(fn, ms); timeoutsRef.current.push(id); return id; }, []);
  const scrollToBottom = useCallback(() => { const el = messagesEndRef.current?.parentElement; if (el) el.scrollTop = el.scrollHeight; }, []);
  const startConversation = useCallback((idx) => { clearTimeouts(); setVisibleMessages([]); setIsTyping(false); setTypedText(''); setConvoIdx(idx); }, [clearTimeouts]);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; clearTimeouts(); }; }, [clearTimeouts]);

  useEffect(() => {
    const messages = DEMO_CONVERSATIONS[convoIdx].messages;
    let step = 0;
    const typeText = (text, speed, onDone) => {
      let i = 0; setTypedText('');
      const tick = () => { if (!mountedRef.current) return; if (i < text.length) { i++; setTypedText(text.slice(0,i)); typingRef.current = setTimeout(tick, speed + Math.random()*15); } else { onDone(); } };
      tick();
    };
    const playStep = () => {
      if (!mountedRef.current || step >= messages.length) { addTimeout(() => { if (mountedRef.current) startConversation((convoIdx+1) % DEMO_CONVERSATIONS.length); }, 4000); return; }
      const msg = messages[step];
      if (msg.role === 'user') {
        addTimeout(() => { if (!mountedRef.current) return; setVisibleMessages(p=>[...p,{...msg}]); setTimeout(scrollToBottom,50); step++; addTimeout(playStep,800); }, 1000);
      } else {
        addTimeout(() => { if (!mountedRef.current) return; setIsTyping(true); setTimeout(scrollToBottom,50);
          addTimeout(() => { if (!mountedRef.current) return; setIsTyping(false); setVisibleMessages(p=>[...p,{...msg,typing:true}]); setTimeout(scrollToBottom,50);
            typeText(msg.text, compact?15:20, () => { setVisibleMessages(p=>p.map((m,i)=>i===p.length-1?{...m,typing:false}:m)); step++; addTimeout(playStep,1500); });
          }, 1500);
        }, 500);
      }
    };
    addTimeout(playStep, 1000);
    return clearTimeouts;
  }, [convoIdx, compact, addTimeout, clearTimeouts, scrollToBottom, startConversation]);

  useEffect(scrollToBottom, [visibleMessages.length, isTyping, scrollToBottom]);

  return (
    <div className={`rounded-3xl overflow-hidden border border-gray-100/50 ${compact?'shadow-xl':'shadow-2xl'} bg-white ${className}`}>
      <div className={`${compact?'px-4 py-3':'px-5 py-4'} border-b border-gray-50 flex items-center justify-between`} style={{background:`linear-gradient(135deg,${BRAND.accentLight},white)`}}>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className={`${compact?'w-8 h-8':'w-9 h-9'} rounded-xl flex items-center justify-center`} style={{background:`linear-gradient(135deg,${BRAND.accent},${BRAND.primary})`}}><Sparkles size={compact?12:14} className="text-white"/></div>
            <div className={`absolute -bottom-0.5 -right-0.5 ${compact?'w-2.5 h-2.5':'w-3 h-3'} bg-green-400 rounded-full border-2 border-white`}/>
          </div>
          <div><p className={`font-semibold ${compact?'text-xs':'text-sm'}`} style={{color:BRAND.primary}}>Zume</p><p className={`${compact?'text-[10px]':'text-xs'} text-green-500 font-medium`}>● Live demo</p></div>
        </div>
        {!compact && <div className="flex items-center gap-1.5">{DEMO_CONVERSATIONS.map((c,i)=><button key={i} onClick={()=>startConversation(i)} className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${convoIdx===i?'text-white':'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`} style={convoIdx===i?{background:BRAND.accent}:{}}>{c.label}</button>)}</div>}
      </div>
      {compact && <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-50 flex items-center justify-between"><span className="text-[10px] font-medium text-gray-400">{currentConvo.label}</span><div className="flex gap-1">{DEMO_CONVERSATIONS.map((_,i)=><div key={i} className="h-1 rounded-full transition-all duration-500" style={{width:i===convoIdx?'14px':'4px',background:i===convoIdx?BRAND.accent:'#CBD5E1'}}/>)}</div></div>}
      <div className={`${compact?'h-[260px] p-3':'h-[340px] p-5'} overflow-y-auto space-y-3 scrollbar-hide`} style={{background:'linear-gradient(180deg,white,#FAFBFD)'}}>
        <div className="flex gap-2 animate-msg-appear">
          <div className={`${compact?'w-6 h-6':'w-7 h-7'} rounded-lg flex items-center justify-center shrink-0 mt-0.5`} style={{background:`linear-gradient(135deg,${BRAND.accent},${BRAND.primary})`}}><Sparkles size={compact?10:12} className="text-white"/></div>
          <div className={`${compact?'px-3 py-2 text-xs':'px-4 py-3 text-sm'} bg-gray-50 rounded-2xl rounded-tl-md text-gray-600`}>Hello! I'm your healthcare assistant. How can I help you today?</div>
        </div>
        {visibleMessages.map((msg,i)=><ChatMessage key={`${convoIdx}-${i}`} role={msg.role} text={msg.text} isTyping={msg.typing&&i===visibleMessages.length-1} typedText={msg.typing&&i===visibleMessages.length-1?typedText:msg.text} compact={compact}/>)}
        {isTyping && <div className="flex gap-2 animate-msg-appear"><div className={`${compact?'w-6 h-6':'w-7 h-7'} rounded-lg flex items-center justify-center shrink-0 mt-0.5`} style={{background:`linear-gradient(135deg,${BRAND.accent},${BRAND.primary})`}}><Sparkles size={compact?10:12} className="text-white"/></div><div className={`${compact?'px-3 py-2':'px-4 py-3'} bg-gray-50 rounded-2xl rounded-tl-md`}><TypingIndicator compact={compact}/></div></div>}
        <div ref={messagesEndRef}/>
      </div>
      <div className={`${compact?'px-3 py-2.5':'px-5 py-3.5'} border-t border-gray-50`}>
        <div className={`flex items-center gap-2 bg-gray-50 ${compact?'rounded-xl px-3 py-2':'rounded-2xl px-4 py-3'} border border-gray-100`}>
          <span className={`text-gray-400 flex-1 ${compact?'text-[10px]':'text-sm'}`}>Ask about healthcare, insurance...</span>
          <div className={`${compact?'w-6 h-6':'w-8 h-8'} rounded-lg flex items-center justify-center`} style={{background:`linear-gradient(135deg,${BRAND.accent},${BRAND.primary})`}}><ArrowRight size={compact?10:13} className="text-white"/></div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ onOpenChat, onOpenContact, onOpenProfile }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeService, setActiveService] = useState(0);
  const [activeFaq, setActiveFaq] = useState(null);
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  return (
    <div className="font-body antialiased" style={{ backgroundColor: BRAND.bg, color: BRAND.text }}>
      <style>{animationStyles}</style>
      <Navbar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} onOpenChat={onOpenChat} onOpenContact={onOpenContact} onOpenProfile={onOpenProfile} />
      <HeroSection onOpenContact={onOpenContact} onOpenChat={onOpenChat} />
      <WellbeingSection />
      <ServicesSection active={activeService} setActive={setActiveService} />
      <AdvantageSection />
      <TestimonialsSection idx={testimonialIdx} setIdx={setTestimonialIdx} />
      <FAQSection active={activeFaq} setActive={setActiveFaq} />
      <Footer />
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   USER MENU
   ════════════════════════════════════════════════════════ */
function UserMenu({ scrolled, isMobile = false, onOpenProfile }) {
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
          className={`flex items-center gap-2.5 px-3 py-2 rounded-full transition-all duration-200 ${
            isMobile
              ? 'text-gray-700 hover:bg-gray-50 w-full'
              : scrolled
                ? 'text-gray-700 hover:bg-gray-50'
                : 'text-white/90 hover:bg-white/10'
          }`}
        >
          {user.pictureUrl ? (
            <img src={user.pictureUrl} alt="" className="w-8 h-8 rounded-full ring-2 ring-white/20" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: BRAND.accent }}>
              <User size={16} className="text-white" />
            </div>
          )}
          <span className="text-sm font-medium truncate max-w-[120px]">
            {user.name || user.email}
          </span>
          <ChevronDown size={14} className="opacity-60" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100/80 py-1.5 z-50 animate-fade-in" style={{ backdropFilter: 'blur(12px)' }}>
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
              </div>
              <button
                onClick={() => { setMenuOpen(false); onOpenProfile && onOpenProfile(); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
              >
                <User size={14} /> My Profile
              </button>
              <button
                onClick={() => { setMenuOpen(false); signOut(); }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 rounded-b-2xl transition-colors"
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
      className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
        isMobile
          ? 'text-gray-700 hover:bg-gray-50 w-full justify-center border border-gray-200'
          : scrolled
            ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
            : 'text-white/90 border border-white/25 hover:bg-white/10 hover:border-white/40'
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
      {signingIn ? 'Signing in...' : 'Sign in'}
    </button>
  );
}

/* ════════════════════════════════════════════════════════
   NAVBAR
   ════════════════════════════════════════════════════════ */
function Navbar({ mobileMenuOpen, setMobileMenuOpen, onOpenChat, onOpenContact, onOpenProfile }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const links = [
    { label: 'Home', href: '#home' },
    { label: 'About', href: '#about' },
    { label: 'Services', href: '#services' },
    { label: 'AI Assistant', href: '#home' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm' : 'bg-white/70 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Main nav */}
        <div className="flex items-center justify-between py-4">
          <a href="#home" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105" style={{ background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.primary})` }}>
              <Heart size={22} className="text-white" />
            </div>
            <div>
              <span className={`text-3xl font-bold tracking-tight font-display text-gray-900`} style={{ color: BRAND.primary }}>
                Zumanely
              </span>
              <p className={`text-[10px] tracking-wide uppercase ${'text-gray-400'}`}>
                Holistic Wellness
              </p>
            </div>
          </a>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-1">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100`}
              >
                {l.label}
              </a>
            ))}
            <div className="ml-2 pl-3 border-l" style={{ borderColor: BRAND.border }}>
              <UserMenu scrolled={scrolled} onOpenProfile={onOpenProfile} />
            </div>
            <button
              onClick={onOpenContact}
              className="ml-3 px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:-translate-y-px"
              style={{ background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.primary})` }}
            >
              Get Started
            </button>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 rounded-xl hover:bg-white/10 transition-colors">
            {mobileMenuOpen ? <X size={22} className={'text-gray-700'} /> : <Menu size={22} className={'text-gray-700'} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-xl shadow-xl border-t border-gray-100 animate-fade-in">
          <div className="px-6 py-5 space-y-1">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors"
              >
                {l.label}
              </a>
            ))}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <UserMenu scrolled={true} isMobile={true} onOpenProfile={onOpenProfile} />
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenContact(); }}
                className="w-full px-5 py-3 rounded-full text-sm font-semibold text-white"
                style={{ background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.primary})` }}
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ════════════════════════════════════════════════════════
   HERO — redesigned layout
   ════════════════════════════════════════════════════════ */
function HeroSection({ onOpenContact, onOpenChat }) {
  const { user } = useAuth();

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: `linear-gradient(180deg, #FFFFFF 0%, ${BRAND.bg} 100%)` }}
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.08] animate-float" style={{ background: `radial-gradient(circle, ${BRAND.accent}, transparent 70%)` }} />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-[0.06]" style={{ background: `radial-gradient(circle, ${BRAND.warm}, transparent 70%)` }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 w-full pt-28 pb-16 lg:pt-32 lg:pb-20">
        {/* Top — tagline */}
        <div className="text-center mb-12 lg:mb-16 animate-fade-in-up">
          <p className="text-lg md:text-xl lg:text-2xl leading-relaxed max-w-3xl mx-auto font-body" style={{ color: BRAND.muted }}>
            Zumanely blends advanced technology with human connection to deliver
            personalized care for your physical, emotional, and mental health.
          </p>
        </div>

        {/* Two columns — Human Specialist (left) + AI Demo (right) */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">

          {/* Left — Talk to Human Specialist */}
          <div className="animate-fade-in-up delay-200">
            <div className="rounded-3xl p-8 lg:p-10 border border-gray-200/80 h-full bg-white shadow-lg flex flex-col">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ background: `${BRAND.warm}15` }}>
                <Users size={26} style={{ color: BRAND.warm }} />
              </div>
              <h2 className="text-2xl lg:text-3xl font-display font-bold mb-4" style={{ color: BRAND.primary }}>
                Talk to Our{' '}
                <span style={{ color: BRAND.warm }}>Human Specialist</span>
              </h2>
              <p className="leading-relaxed mb-6 text-base" style={{ color: BRAND.muted }}>
                It's free and only 20 minutes to understand what custom care you need.
                Our specialists provide personalized guidance for your unique health journey.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  'Free 20-minute consultation call',
                  'Personalized care plan for your needs',
                  'Expert guidance on insurance & coverage',
                  'Connect with the right specialists',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: `${BRAND.warm}15` }}>
                      <CheckCircle2 size={12} style={{ color: BRAND.warm }} />
                    </div>
                    <span className="text-sm" style={{ color: BRAND.muted }}>{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex-grow" />
              <button
                onClick={() => onOpenContact('free-20')}
                className="group w-full px-7 py-4 rounded-full text-sm font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2.5"
                style={{ background: `linear-gradient(135deg, ${BRAND.warm}, #E8941A)`, color: 'white' }}
              >
                <Phone size={18} />
                Schedule a Free 20-Min Call
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => onOpenContact('paid-60')}
                className="group w-full mt-3 px-7 py-4 rounded-full text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2.5 border-2"
                style={{ borderColor: BRAND.primary, color: BRAND.primary, background: 'white' }}
              >
                <Clock size={18} />
                Full Hour Session — Only $19.99
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Right — AI Demo */}
          <div className="animate-slide-right delay-300">
            <div className="rounded-3xl p-8 lg:p-10 border border-gray-200/80 h-full bg-white shadow-lg flex flex-col">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: BRAND.accent }}>
                  Zume
                </p>
                <p className="text-sm" style={{ color: BRAND.muted }}>
                  Try Zume - your AI health assistant
                </p>
              </div>

              <AnimatedChatDemo variant="compact" />

              <div className="flex items-center justify-center gap-2 mt-4 mb-6">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-medium" style={{ color: BRAND.muted }}>Live demo — cycling through real conversations</span>
              </div>

              <div className="flex-grow" />
              <button
                onClick={onOpenChat}
                className="group w-full px-7 py-4 rounded-full text-sm font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2.5"
                style={{ background: `linear-gradient(135deg, ${BRAND.accent}, #1B8A7E)`, color: 'white' }}
              >
                <MessageSquare size={18} />
                {user ? 'Continue Chatting with Zume' : 'Try Zume Now'}
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
   WELL-BEING JOURNEY (kept but refined)
   ════════════════════════════════════════════════════════ */
function WellbeingSection() {
  const cards = [
    { title: 'Self Employed', desc: 'Supporting entrepreneurs navigating emotional, behavioral, and physical well-being challenges unique to self-employment.', icon: <Activity size={24} />, color: '#2AA89A' },
    { title: 'Unemployed', desc: 'Counseling for depression, anxiety, and mental health impacts of unemployment — with compassionate professional support.', icon: <Users size={24} />, color: '#4A90D9' },
    { title: 'Care Givers', desc: 'Guidance for caregivers facing immense stress — maintaining your own wellness while caring for loved ones.', icon: <Heart size={24} />, color: '#F9A826' },
    { title: 'Visitors', desc: 'Healthcare navigation for visitors and families — ensuring the right assistance with compassion and ease.', icon: <Plane size={24} />, color: '#E84D70' },
  ];

  return (
    <section id="about" className="py-28 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mx-auto text-center mb-20">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] mb-4" style={{ color: BRAND.accent }}>
            Who We Serve
          </p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-5" style={{ color: BRAND.primary }}>
            Wellness Journey for All
          </h2>
          <p className="text-gray-500 leading-relaxed">
            Accessible holistic home care that feels truly personal — for caregivers,
            seniors, individuals, and families.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((c, i) => (
            <div
              key={i}
              className="group relative bg-white rounded-3xl p-8 border border-gray-100/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-500"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110"
                style={{ background: `${c.color}12`, color: c.color }}
              >
                {c.icon}
              </div>
              <h3 className="text-base font-bold mb-3 font-display" style={{ color: BRAND.primary }}>
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
   AI CHAT ASSISTANT — moved up
   ════════════════════════════════════════════════════════ */
function AIChatSection({ onOpenChat }) {
  return (
    <section id="ai-chat" className="py-28 px-6 lg:px-8" style={{ background: `linear-gradient(180deg, white 0%, ${BRAND.accentLight} 100%)` }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — full animated chat demo */}
          <div className="order-2 lg:order-1">
            <AnimatedChatDemo variant="full" className="max-w-md mx-auto lg:mx-0" />
          </div>

          {/* Right — text */}
          <div className="order-1 lg:order-2">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] mb-4" style={{ color: BRAND.accent }}>
              AI-Powered
            </p>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6" style={{ color: BRAND.primary }}>
              Meet{' '}
              <span style={{ color: BRAND.accent }}>Zume</span>
            </h2>
            <p className="text-gray-500 leading-relaxed mb-10 text-base">
              Available 24/7 to answer your healthcare questions, explain insurance plans,
              help you find doctors, and guide you through Medicare and Medicaid options.
            </p>

            <div className="space-y-4 mb-10">
              {[
                'Ask about Medicare, Medicaid & insurance plans',
                'Find doctors accepting your insurance',
                'Understand deductibles, copays & coverage',
                'Get personalized healthcare guidance',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: BRAND.accentLight }}>
                    <CheckCircle2 size={14} style={{ color: BRAND.accent }} />
                  </div>
                  <span className="text-sm text-gray-600">{item}</span>
                </div>
              ))}
            </div>

            <button
              onClick={onOpenChat}
              className="group px-7 py-4 rounded-full text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2.5"
              style={{ background: `linear-gradient(135deg, ${BRAND.accent}, #1B8A7E)`, color: 'white' }}
            >
              <MessageSquare size={18} />
              Start a Conversation
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
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
    { title: 'Complex Care', icon: <Stethoscope size={22} />, desc: 'Comprehensive care management for individuals with complex medical needs and chronic conditions. Our providers coordinate across specialists for seamless care.' },
    { title: 'Stress Management', icon: <Brain size={22} />, desc: 'Evidence-based programs combining mindfulness, counseling, and lifestyle coaching. Build resilience and develop sustainable wellness habits.' },
    { title: 'Personal Health', icon: <Heart size={22} />, desc: 'Personalized programs from nutrition coaching and fitness guidance to preventive care planning for your optimal well-being.' },
    { title: 'Visitor Care', icon: <Plane size={22} />, desc: 'Specialized care navigation for visitors and families. Access healthcare services and understand insurance options during your stay.' },
  ];

  return (
    <section id="services" className="py-28 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mx-auto text-center mb-20">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] mb-4" style={{ color: BRAND.accent }}>
            What We Offer
          </p>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-5" style={{ color: BRAND.primary }}>
            Our Services
          </h2>
          <p className="text-gray-500 leading-relaxed">
            Holistic wellness solutions supported by care coordination, management, and patient advocacy.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {services.map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`text-left rounded-3xl p-8 border-2 transition-all duration-500 ${
                active === i
                  ? 'bg-white shadow-xl border-teal-100 -translate-y-1'
                  : 'bg-white/60 border-transparent hover:bg-white hover:shadow-md'
              }`}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300"
                style={{
                  background: active === i ? BRAND.accent : `${BRAND.accent}12`,
                  color: active === i ? 'white' : BRAND.accent,
                  transform: active === i ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {s.icon}
              </div>
              <h3 className="text-base font-bold mb-3 font-display" style={{ color: BRAND.primary }}>{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
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
    { title: 'Digital Care', desc: 'Seamless teleconferencing technology for clients and patients everywhere.', icon: <Globe size={22} /> },
    { title: 'Care for Everyone', desc: 'Helping people live healthier, happier lives — including self-employed & unemployed.', icon: <Users size={22} /> },
    { title: 'Holistic Approach', desc: 'Nutrition coaching, fitness training, transportation, grocery delivery, and adult care.', icon: <Heart size={22} /> },
    { title: 'Wide Coverage', desc: 'Nationwide network of providers and specialists for the right medical professional.', icon: <MapPin size={22} /> },
  ];

  return (
    <section className="py-28 px-6 lg:px-8" style={{ background: BRAND.primary }}>
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mx-auto text-center mb-20">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] mb-4" style={{ color: BRAND.accent }}>
            Why Choose Us
          </p>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-5">
            Holistic Care, Anytime, Anywhere
          </h2>
          <p className="text-white/50 leading-relaxed">
            Simplified medical and wellness processes so you can focus on healing and growth.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {advantages.map((a, i) => (
            <div
              key={i}
              className="rounded-3xl p-8 border border-white/8 hover:border-white/15 transition-all duration-500 group"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110" style={{ background: `${BRAND.accent}25` }}>
                <span style={{ color: BRAND.accent }}>{a.icon}</span>
              </div>
              <h3 className="text-white font-bold text-base mb-3 font-display">{a.title}</h3>
              <p className="text-white/45 text-sm leading-relaxed">{a.desc}</p>
            </div>
          ))}
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
    { name: 'Sarah L.', role: 'Caregiver', text: "Zumanely has been a game-changer for me as a caregiver. The emotional support and expert guidance helped me navigate my loved one's health journey with confidence.", rating: 5 },
    { name: 'David R.', role: 'Entrepreneur', text: "Being self-employed, I struggled to find reliable healthcare resources. Zumanely made it easy to access expert medical advice, fitness coaching, and mental health support — all in one place.", rating: 5 },
    { name: 'Mark T.', role: 'Job Seeker', text: "Losing my job was stressful enough. Zumanely connected me with the right professionals and support services, making the process smooth and stress-free.", rating: 5 },
  ];

  const next = () => setIdx((idx + 1) % testimonials.length);
  const prev = () => setIdx((idx - 1 + testimonials.length) % testimonials.length);

  return (
    <section className="py-28 px-6 lg:px-8" style={{ background: BRAND.warmLight }}>
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] mb-4" style={{ color: BRAND.accent }}>
          Testimonials
        </p>
        <h2 className="text-3xl md:text-4xl font-display font-bold mb-16" style={{ color: BRAND.primary }}>
          Real Stories, Real Impact
        </h2>

        <div className="bg-white rounded-3xl p-10 lg:p-12 shadow-lg border border-gray-100/50">
          <div className="flex justify-center gap-1 mb-8">
            {Array.from({ length: testimonials[idx].rating }).map((_, i) => (
              <Star key={i} size={18} className="fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <blockquote className="text-lg text-gray-600 leading-relaxed mb-8 italic max-w-xl mx-auto">
            "{testimonials[idx].text}"
          </blockquote>
          <p className="font-bold font-display text-lg" style={{ color: BRAND.primary }}>{testimonials[idx].name}</p>
          <p className="text-sm text-gray-400 mt-1">{testimonials[idx].role}</p>
        </div>

        <div className="flex justify-center items-center gap-4 mt-10">
          <button onClick={prev} className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:shadow-lg transition-all" style={{ color: BRAND.primary }}>
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            {testimonials.map((_, i) => (
              <span
                key={i}
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: i === idx ? '28px' : '8px',
                  background: i === idx ? BRAND.accent : '#CBD5E1',
                }}
              />
            ))}
          </div>
          <button onClick={next} className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:shadow-lg transition-all" style={{ color: BRAND.primary }}>
            <ChevronRight size={18} />
          </button>
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
    { q: 'How does Zumanely provide support for caregivers?', a: 'We offer emotional support, access to specialized healthcare professionals, and essential services such as nutrition coaching, fitness training, and transportation for seniors.' },
    { q: 'Do I need insurance to use Zumanely?', a: 'No, Zumanely is accessible to everyone, regardless of insurance coverage. We focus on making healthcare guidance and support available to all individuals.' },
    { q: 'How do I get started?', a: "Simply click on the Get Started button, share your needs, and we'll connect you with the right professionals and resources to support your well-being." },
  ];

  return (
    <section className="py-28 px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] mb-4" style={{ color: BRAND.accent }}>FAQ</p>
          <h2 className="text-3xl md:text-4xl font-display font-bold" style={{ color: BRAND.primary }}>
            Common Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div
              key={i}
              className={`bg-white rounded-2xl border transition-all duration-300 ${
                active === i ? 'border-teal-100 shadow-md' : 'border-gray-100'
              }`}
            >
              <button
                onClick={() => setActive(active === i ? null : i)}
                className="w-full flex items-center justify-between px-7 py-5 text-left"
              >
                <span className="font-semibold text-sm pr-4" style={{ color: BRAND.primary }}>{f.q}</span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 transition-transform duration-300 ${active === i ? 'rotate-180' : ''}`}
                  style={{ color: BRAND.accent }}
                />
              </button>
              {active === i && (
                <div className="px-7 pb-6 text-sm text-gray-500 leading-relaxed animate-fade-in">
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
      <div className="border-b border-white/8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-14 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-white text-center md:text-left">
            <h3 className="text-2xl font-display font-bold mb-2">Compassionate Care, Anytime, Anywhere</h3>
            <p className="text-white/45 text-sm">Get holistic home health care tailored to your needs.</p>
          </div>
          <a
            href="#ai-chat"
            className="px-8 py-4 rounded-full text-sm font-semibold shadow-xl transition-all whitespace-nowrap hover:-translate-y-0.5"
            style={{ background: `linear-gradient(135deg, ${BRAND.accent}, #1B8A7E)`, color: 'white' }}
          >
            Free Consultation
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 grid md:grid-cols-4 gap-12">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${BRAND.accent}25` }}>
              <Heart size={18} style={{ color: BRAND.accent }} />
            </div>
            <span className="text-white text-lg font-display font-bold">Zumanely</span>
          </div>
          <p className="text-white/40 text-sm leading-relaxed">
            Compassionate Care, Tailored Support, Powered by AI
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm mb-6">Quick Links</h4>
          <div className="space-y-3.5 text-sm">
            {['Home', 'About', 'Services', 'Contact'].map((l) => (
              <a key={l} href="#" className="block text-white/40 hover:text-white/80 transition-colors">{l}</a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm mb-6">Services</h4>
          <div className="space-y-3.5 text-sm">
            {['Complex Care', 'Stress Management', 'Personal Health', 'Visitor Care'].map((l) => (
              <a key={l} href="#" className="block text-white/40 hover:text-white/80 transition-colors">{l}</a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm mb-6">Contact</h4>
          <div className="space-y-3.5 text-sm text-white/40">
            <a href="tel:4089826644" className="flex items-center gap-2.5 hover:text-white/80 transition-colors">
              <Phone size={13} /> (408) 982-6644
            </a>
            <a href="mailto:zumanely0@gmail.com" className="flex items-center gap-2.5 hover:text-white/80 transition-colors">
              <Mail size={13} /> zumanely0@gmail.com
            </a>
            <p className="flex items-start gap-2.5">
              <MapPin size={13} className="shrink-0 mt-0.5" />
              41079 Bernie St, Fremont, CA 94539
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 text-center text-xs text-white/30">
          © 2025 Zumanely. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}
