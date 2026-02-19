import React, { useState, useEffect } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  User,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  Heart,
  CheckCircle2,
  Loader2,
  Sparkles,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getAvailableSlots, bookSlot, createCheckoutSession } from '../services/api';

const BRAND = {
  primary: '#1B3A5C',
  accent: '#2AA89A',
  accentLight: '#E6F7F5',
  warm: '#F9A826',
  warmLight: '#FFF8EB',
  bg: '#FAFBFD',
  text: '#1E293B',
  muted: '#64748B',
};

export default function ContactPage({ onBack, onOpenChat, user, sessionType = 'free-20' }) {
  const isPaid = sessionType === 'paid-60';
  const [step, setStep] = useState(1); // 1=form, 2=slots, 3=confirmed
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    service: '',
    message: '',
  });

  // Feature 3: Autofill form from user profile when signed in
  useEffect(() => {
    if (user) {
      const savedUser = localStorage.getItem('healthassist_user');
      let profileData = user;
      if (savedUser) {
        try { profileData = { ...user, ...JSON.parse(savedUser) }; } catch (e) {}
      }
      const nameParts = (profileData.name || '').split(' ');
      setFormData((prev) => ({
        ...prev,
        firstName: profileData.firstName || nameParts[0] || prev.firstName,
        lastName: profileData.lastName || nameParts.slice(1).join(' ') || prev.lastName,
        email: profileData.email || prev.email,
        phone: profileData.phone || prev.phone,
      }));
    }
  }, [user]);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [booking, setBooking] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [slotsError, setSlotsError] = useState(null);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoadingSlots(true);
    setSlotsError(null);
    try {
      const data = await getAvailableSlots();
      setSlots(data.slots || []);
      if (data.slots && data.slots.length > 0) {
        setSelectedDate(data.slots[0].date);
      }
      setStep(2);
    } catch (err) {
      console.error('Failed to load slots:', err);
      setSlotsError('Unable to load available time slots. Please try again.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookSlot = async () => {
    if (!selectedSlot) return;
    setBooking(true);
    try {
      if (isPaid) {
        // Paid flow: create Stripe Checkout Session
        const result = await createCheckoutSession({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          service: formData.service,
          message: formData.message,
          slotStart: selectedSlot.start,
          displayDateTime: `${selectedSlot.dayOfWeek}, ${selectedSlot.date} at ${selectedSlot.time}`,
        });
        if (result.success && result.checkoutUrl) {
          // Redirect to Stripe Checkout
          window.location.href = result.checkoutUrl;
          return;
        } else {
          setBookingResult({ success: false, error: result.error || 'Payment setup failed.' });
        }
      } else {
        // Free flow: book directly
        const result = await bookSlot({
          startTime: selectedSlot.start,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          service: formData.service,
          message: formData.message,
          displayDateTime: `${selectedSlot.dayOfWeek}, ${selectedSlot.date} at ${selectedSlot.time}`,
        });
        setBookingResult(result);
        if (result.success) {
          setStep(3);
        }
      }
    } catch (err) {
      console.error('Booking failed:', err);
      setBookingResult({ success: false, error: 'Booking failed. Please try again.' });
    } finally {
      setBooking(false);
    }
  };

  // Group slots by date
  const slotsByDate = {};
  slots.forEach((s) => {
    if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
    slotsByDate[s.date].push(s);
  });
  const availableDates = Object.keys(slotsByDate);

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="font-sans antialiased min-h-screen" style={{ backgroundColor: BRAND.bg, color: BRAND.text }}>
      {/* Hero */}
      <section
        className="relative pt-32 pb-20 px-6 overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${BRAND.primary} 0%, #0D2640 50%, #134E5E 100%)` }}
      >
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full opacity-10" style={{ background: BRAND.accent }} />

        <button
          onClick={step === 2 ? () => setStep(1) : onBack}
          className="absolute top-6 left-6 flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm z-10"
        >
          <ArrowLeft size={18} />
          {step === 2 ? 'Back to Form' : 'Back to Home'}
        </button>

        <div className="relative max-w-4xl mx-auto text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            {step === 1 && (isPaid ? 'Book a 1-Hour Session' : 'Schedule a Consultation')}
            {step === 2 && 'Pick a Time'}
            {step === 3 && 'You\'re All Set!'}
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            {step === 1 && (isPaid
              ? 'Fill out the form and choose a time for your full-hour specialist session ($19.99).'
              : 'Fill out the form and choose a convenient 20-minute call with our team.')}
            {step === 2 && (isPaid
              ? 'Select a date and time for your 1-hour session.'
              : 'Select a date and time that works best for you.')}
            {step === 3 && (isPaid
              ? 'Your payment was successful and your session has been booked.'
              : 'Your consultation has been booked. Check your email for confirmation.')}
          </p>

          {/* Progress steps */}
          <div className="flex items-center justify-center gap-3 mt-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step >= s ? 'text-white' : 'text-white/30 border border-white/20'
                  }`}
                  style={step >= s ? { background: BRAND.accent } : {}}
                >
                  {step > s ? <CheckCircle2 size={16} /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-12 h-0.5 rounded ${step > s ? 'bg-teal-400' : 'bg-white/15'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-12">
          {/* Left sidebar */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-xl font-bold mb-6" style={{ color: BRAND.primary }}>Contact Information</h2>
              <div className="space-y-5">
                {[
                  { icon: <Phone size={18} />, label: 'Call Us', value: '(408) 982-6644', href: 'tel:4089826644' },
                  { icon: <Mail size={18} />, label: 'Email Us', value: 'zumanely0@gmail.com', href: 'mailto:zumanely0@gmail.com' },
                  { icon: <MapPin size={18} />, label: 'Visit Us', value: '41079 Bernie St, Fremont, CA 94539' },
                  { icon: <Clock size={18} />, label: 'Hours', value: 'Mon – Fri: 9 AM – 5 PM PST' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: BRAND.accentLight, color: BRAND.accent }}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                      {item.href ? (
                        <a href={item.href} className="text-sm font-semibold hover:text-teal-700 transition-colors" style={{ color: BRAND.primary }}>
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-sm font-semibold" style={{ color: BRAND.primary }}>{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-6 border border-white/20" style={{ background: `linear-gradient(135deg, ${BRAND.primary}, #0F2B47)` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${BRAND.accent}30` }}>
                  <Sparkles size={18} style={{ color: BRAND.accent }} />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Need instant help?</p>
                  <p className="text-white/50 text-xs">Our AI assistant is available 24/7</p>
                </div>
              </div>
              <button
                onClick={onOpenChat}
                className="w-full px-5 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                style={{ background: `linear-gradient(135deg, ${BRAND.accent}, #1B8A7E)` }}
              >
                <MessageSquare size={16} />
                Chat with AI Assistant
              </button>
            </div>
          </div>

          {/* Right - main content area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-gray-100">

              {/* ── STEP 1: Form ── */}
              {step === 1 && (
                <>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: BRAND.primary, fontFamily: "'Playfair Display', Georgia, serif" }}>
                    Tell Us About Yourself
                  </h2>
                  <p className="text-gray-400 text-sm mb-8">
                    After filling out the form, you'll be able to pick a convenient time slot.
                  </p>

                  <form onSubmit={handleFormSubmit} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>First Name *</label>
                        <div className="relative">
                          <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange}
                            placeholder="John"
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>Last Name *</label>
                        <div className="relative">
                          <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange}
                            placeholder="Doe"
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all" />
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>Email Address *</label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input type="email" name="email" required value={formData.email} onChange={handleChange}
                            placeholder="john@example.com"
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>Phone Number</label>
                        <div className="relative">
                          <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                            placeholder="(408) 555-1234"
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>Service interested in?</label>
                      <select name="service" value={formData.service} onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}>
                        <option value="">Select a service</option>
                        <option value="Complex Care">Complex Care</option>
                        <option value="Stress Management">Stress Management</option>
                        <option value="Personal Health">Personal Health</option>
                        <option value="Visitor Care">Visitor Care</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>Message</label>
                      <textarea name="message" rows={4} value={formData.message} onChange={handleChange}
                        placeholder="Tell us about your needs..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all resize-none" />
                    </div>

                    {slotsError && (
                      <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{slotsError}</div>
                    )}

                    <button type="submit" disabled={loadingSlots}
                      className="w-full py-4 rounded-xl text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                      style={{ background: isPaid
                        ? `linear-gradient(135deg, ${BRAND.primary}, #0D2640)`
                        : `linear-gradient(135deg, ${BRAND.accent}, #1B8A7E)` }}>
                      {loadingSlots ? (
                        <><Loader2 size={18} className="animate-spin" /> Loading available times...</>
                      ) : isPaid ? (
                        <><Calendar size={18} /> Choose Time for 1-Hour Session — $19.99</>
                      ) : (
                        <><Calendar size={18} /> Schedule a 20-Minute Call</>
                      )}
                    </button>
                  </form>
                </>
              )}

              {/* ── STEP 2: Slot Picker ── */}
              {step === 2 && (
                <>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: BRAND.primary, fontFamily: "'Playfair Display', Georgia, serif" }}>
                    Choose a Time Slot
                  </h2>
                  <p className="text-gray-400 text-sm mb-6">
                    {isPaid
                      ? 'Select a 1-hour slot that works for you. All times are in Pacific Time (PST).'
                      : 'Select a 20-minute slot that works for you. All times are in Pacific Time (PST).'}
                  </p>

                  {slots.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">No available slots found. Please try again later.</p>
                      <button onClick={() => setStep(1)} className="mt-4 text-sm font-semibold" style={{ color: BRAND.accent }}>
                        ← Back to form
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Date selector - horizontal scroll */}
                      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
                        {availableDates.map((date) => (
                          <button
                            key={date}
                            onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                            className={`shrink-0 px-4 py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                              selectedDate === date
                                ? 'border-teal-300 bg-teal-50 text-teal-800 shadow-sm'
                                : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
                            }`}
                          >
                            {formatDateLabel(date)}
                          </button>
                        ))}
                      </div>

                      {/* Time slots grid */}
                      {selectedDate && slotsByDate[selectedDate] && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-8">
                          {slotsByDate[selectedDate].map((slot, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-3 px-3 rounded-xl text-sm font-medium transition-all border-2 ${
                                selectedSlot?.start === slot.start
                                  ? 'border-teal-400 bg-teal-50 text-teal-800 shadow-md'
                                  : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-teal-200 hover:bg-teal-50/50'
                              }`}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Selected slot summary + confirm */}
                      {selectedSlot && (
                        <div className="rounded-2xl p-5 mb-6 border" style={{ background: BRAND.accentLight, borderColor: '#B2DFDB' }}>
                          <div className="flex items-center gap-3 mb-3">
                            <Calendar size={20} style={{ color: BRAND.accent }} />
                            <div>
                              <p className="font-semibold text-sm" style={{ color: BRAND.primary }}>
                                {formatDateLabel(selectedSlot.date)} at {selectedSlot.time}
                              </p>
                              <p className="text-xs text-gray-500">
                                {isPaid ? '1-hour specialist session — $19.99' : '20-minute consultation call'}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">
                            Booking for: <strong>{formData.firstName} {formData.lastName}</strong> ({formData.email})
                          </p>
                        </div>
                      )}

                      {bookingResult && !bookingResult.success && (
                        <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl mb-4">{bookingResult.error}</div>
                      )}

                      <button
                        onClick={handleBookSlot}
                        disabled={!selectedSlot || booking}
                        className="w-full py-4 rounded-xl text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                        style={{ background: isPaid
                          ? `linear-gradient(135deg, ${BRAND.primary}, #0D2640)`
                          : `linear-gradient(135deg, ${BRAND.accent}, #1B8A7E)` }}
                      >
                        {booking ? (
                          <><Loader2 size={18} className="animate-spin" /> {isPaid ? 'Redirecting to Payment...' : 'Booking...'}</>
                        ) : isPaid ? (
                          <><CheckCircle2 size={18} /> Pay $19.99 & Confirm Booking</>
                        ) : (
                          <><CheckCircle2 size={18} /> Confirm Booking</>
                        )}
                      </button>
                    </>
                  )}
                </>
              )}

              {/* ── STEP 3: Confirmation ── */}
              {step === 3 && (
                <div className="text-center py-10">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ background: BRAND.accentLight }}>
                    <CheckCircle2 size={40} style={{ color: BRAND.accent }} />
                  </div>
                  <h3 className="text-2xl font-bold mb-3" style={{ color: BRAND.primary, fontFamily: "'Playfair Display', Georgia, serif" }}>
                    {isPaid ? 'Session Booked & Paid!' : 'Consultation Booked!'}
                  </h3>
                  <p className="text-gray-500 mb-2">
                    Your {isPaid ? '1-hour session' : '20-minute call'} is confirmed for:
                  </p>
                  {selectedSlot && (
                    <div className="inline-block rounded-xl px-6 py-3 mb-6" style={{ background: BRAND.accentLight }}>
                      <p className="font-bold text-lg" style={{ color: BRAND.primary }}>
                        {formatDateLabel(selectedSlot.date)} at {selectedSlot.time}
                      </p>
                    </div>
                  )}
                  <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
                    A confirmation email and calendar invite have been sent to <strong>{formData.email}</strong>.
                    We look forward to speaking with you!
                  </p>
                  <div className="flex justify-center gap-4">
                    <button onClick={onBack}
                      className="px-6 py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
                      Back to Home
                    </button>
                    <button onClick={onOpenChat}
                      className="px-6 py-3 rounded-xl text-sm font-semibold text-white flex items-center gap-2"
                      style={{ background: `linear-gradient(135deg, ${BRAND.accent}, #1B8A7E)` }}>
                      <MessageSquare size={16} /> Chat with AI
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer style={{ background: BRAND.primary }}>
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-xs text-white/30">
          © 2025 Zumanely. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
