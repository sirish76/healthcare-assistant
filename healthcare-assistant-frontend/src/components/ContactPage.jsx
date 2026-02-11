import React, { useState } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  User,
  MessageSquare,
  ArrowLeft,
  Heart,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';

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

export default function ContactPage({ onBack, onOpenChat }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    service: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate submission
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1500);
  };

  return (
    <div className="font-sans antialiased min-h-screen" style={{ backgroundColor: BRAND.bg, color: BRAND.text }}>
      {/* Hero Banner */}
      <section
        className="relative pt-32 pb-20 px-6 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${BRAND.primary} 0%, #0F2B47 40%, ${BRAND.accent} 100%)` }}
      >
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full opacity-10" style={{ background: BRAND.accent }} />
        <div className="absolute bottom-0 left-10 w-64 h-64 rounded-full opacity-5" style={{ background: BRAND.warm }} />

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-6 left-6 flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm z-10"
        >
          <ArrowLeft size={18} />
          Back to Home
        </button>

        <div className="relative max-w-4xl mx-auto text-center text-white">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-sm mb-6 border border-white/10">
            <span className="text-yellow-400">★</span>
            Rated 9.9/10 By Caregivers, Patients & Families
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-6">Contact Us</h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
            Need personalized support? Get in touch for expert assistance in managing
            complex conditions, stress, personal health, and visitor care.
          </p>
        </div>
      </section>

      {/* Contact Info + Form */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-12">
          {/* Left - Contact Info */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6" style={{ color: BRAND.primary }}>
                Contact Us
              </h2>

              <div className="space-y-5">
                <a
                  href="tel:4089826644"
                  className="flex items-start gap-4 group"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: BRAND.accentLight, color: BRAND.accent }}
                  >
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-0.5">Call Us</p>
                    <p className="font-semibold group-hover:text-teal-700 transition-colors" style={{ color: BRAND.primary }}>
                      (408) 982-6644
                    </p>
                  </div>
                </a>

                <a
                  href="mailto:zumanely0@gmail.com"
                  className="flex items-start gap-4 group"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: BRAND.accentLight, color: BRAND.accent }}
                  >
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-0.5">Email Us</p>
                    <p className="font-semibold group-hover:text-teal-700 transition-colors" style={{ color: BRAND.primary }}>
                      zumanely0@gmail.com
                    </p>
                  </div>
                </a>

                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: BRAND.accentLight, color: BRAND.accent }}
                  >
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-0.5">Visit Us</p>
                    <p className="font-semibold" style={{ color: BRAND.primary }}>
                      41079 Bernie St, Fremont, CA 94539
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: BRAND.accentLight, color: BRAND.accent }}
                  >
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-0.5">Hours</p>
                    <p className="font-semibold" style={{ color: BRAND.primary }}>
                      Mon – Fri: 9 AM – 6 PM PST
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Chat CTA */}
            <div
              className="rounded-2xl p-6 border border-white/20"
              style={{ background: `linear-gradient(135deg, ${BRAND.primary}, #0F2B47)` }}
            >
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

          {/* Right - Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-gray-100">
              <h2 className="text-2xl font-bold mb-2" style={{ color: BRAND.primary }}>
                Get In Touch With Us
              </h2>
              <p className="text-gray-500 text-sm mb-8">
                Fill out the form below and our team will get back to you within 24 hours.
              </p>

              {submitted ? (
                <div className="text-center py-12 animate-fade-in">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ background: BRAND.accentLight }}
                  >
                    <CheckCircle2 size={40} style={{ color: BRAND.accent }} />
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: BRAND.primary }}>
                    Thank You!
                  </h3>
                  <p className="text-gray-500 mb-6">
                    We've received your message and will get back to you within 24 hours.
                  </p>
                  <button
                    onClick={onBack}
                    className="px-6 py-3 rounded-xl text-sm font-semibold text-white"
                    style={{ background: `linear-gradient(135deg, ${BRAND.accent}, #1B8A7E)` }}
                  >
                    Back to Home
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>
                        First Name *
                      </label>
                      <div className="relative">
                        <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          name="firstName"
                          required
                          value={formData.firstName}
                          onChange={handleChange}
                          placeholder="John"
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>
                        Last Name *
                      </label>
                      <div className="relative">
                        <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          name="lastName"
                          required
                          value={formData.lastName}
                          onChange={handleChange}
                          placeholder="Doe"
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="john@example.com"
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="(408) 555-1234"
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>
                      What service are you interested in?
                    </label>
                    <select
                      name="service"
                      value={formData.service}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all appearance-none"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                    >
                      <option value="">Select a service</option>
                      <option value="complex-care">Complex Care</option>
                      <option value="stress-management">Stress Management</option>
                      <option value="personal-health">Personal Health</option>
                      <option value="visitor-care">Visitor Care</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>
                      Message *
                    </label>
                    <textarea
                      name="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us about your needs and how we can help..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-xl text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: `linear-gradient(135deg, ${BRAND.accent}, #1B8A7E)` }}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Send Message
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-400 text-center">
                    By submitting this form, you agree to our Privacy Policy and Terms of Service.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: BRAND.primary }}>
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-xs text-white/40">
          Copyright 2025 Zumanely. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}

