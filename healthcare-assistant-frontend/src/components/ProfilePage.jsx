import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile } from '../services/api';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Save,
  Loader2,
  CheckCircle2,
  Camera,
  Shield,
  Calendar,
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

export default function ProfilePage({ onBack }) {
  const { user, signOut } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await getProfile();
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        phone: profile.phone || '',
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
      // Fall back to data from auth context
      if (user) {
        const nameParts = (user.name || '').split(' ');
        setFormData({
          firstName: user.firstName || nameParts[0] || '',
          lastName: user.lastName || nameParts.slice(1).join(' ') || '',
          email: user.email || '',
          phone: user.phone || '',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSaved(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateProfile(formData);
      // Update localStorage with new profile data
      const savedUser = localStorage.getItem('healthassist_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        parsed.firstName = updated.firstName;
        parsed.lastName = updated.lastName;
        parsed.phone = updated.phone;
        parsed.email = updated.email;
        parsed.name = updated.name;
        localStorage.setItem('healthassist_user', JSON.stringify(parsed));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BRAND.bg }}>
        <div className="text-center">
          <User size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Please sign in to view your profile.</p>
          <button onClick={onBack} className="mt-4 text-sm font-semibold" style={{ color: BRAND.accent }}>
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans antialiased min-h-screen" style={{ backgroundColor: BRAND.bg, color: BRAND.text }}>
      {/* Hero Header */}
      <section
        className="relative pt-28 pb-16 px-6 overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${BRAND.primary} 0%, #0D2640 50%, #134E5E 100%)` }}
      >
        <div className="absolute top-16 right-10 w-60 h-60 rounded-full opacity-10" style={{ background: BRAND.accent }} />

        <button
          onClick={onBack}
          className="absolute top-6 left-6 flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm z-10"
        >
          <ArrowLeft size={18} />
          Back to Home
        </button>

        <div className="relative max-w-2xl mx-auto text-center text-white">
          {/* Profile avatar */}
          <div className="relative inline-block mb-6">
            {user.pictureUrl ? (
              <img
                src={user.pictureUrl}
                alt=""
                className="w-24 h-24 rounded-full ring-4 ring-white/20 shadow-2xl"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center ring-4 ring-white/20 shadow-2xl"
                style={{ background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.primary})` }}
              >
                <User size={40} className="text-white" />
              </div>
            )}
            <div
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-md"
              style={{ background: BRAND.accent }}
            >
              <Camera size={14} className="text-white" />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            My Profile
          </h1>
          <p className="text-white/50 text-sm">
            Manage your personal information
          </p>
        </div>
      </section>

      {/* Profile Form */}
      <section className="py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-gray-100">
            {loading ? (
              <div className="text-center py-12">
                <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: BRAND.accent }} />
                <p className="text-gray-400 text-sm">Loading profile...</p>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold mb-1" style={{ color: BRAND.primary, fontFamily: "'Playfair Display', Georgia, serif" }}>
                    Personal Information
                  </h2>
                  <p className="text-gray-400 text-sm mb-6">
                    Update your details below. This information will be used to autofill scheduling forms.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>
                      First Name
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="John"
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>
                      Last Name
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder="Doe"
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: BRAND.primary }}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all"
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
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</div>
                )}

                {saved && (
                  <div className="flex items-center gap-2 text-sm p-3 rounded-xl" style={{ background: BRAND.accentLight, color: BRAND.accent }}>
                    <CheckCircle2 size={16} />
                    Profile updated successfully!
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-4 rounded-xl text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${BRAND.accent}, #1B8A7E)` }}
                >
                  {saving ? (
                    <><Loader2 size={18} className="animate-spin" /> Saving...</>
                  ) : (
                    <><Save size={18} /> Save Profile</>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Account info card */}
          <div className="mt-6 bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold mb-4" style={{ color: BRAND.primary, fontFamily: "'Playfair Display', Georgia, serif" }}>
              Account
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: BRAND.accentLight }}>
                  <Shield size={16} style={{ color: BRAND.accent }} />
                </div>
                <div>
                  <p className="font-medium" style={{ color: BRAND.primary }}>Signed in with Google</p>
                  <p className="text-gray-400 text-xs">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: BRAND.warmLight }}>
                  <Calendar size={16} style={{ color: BRAND.warm }} />
                </div>
                <div>
                  <p className="font-medium" style={{ color: BRAND.primary }}>Member since</p>
                  <p className="text-gray-400 text-xs">
                    {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
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
