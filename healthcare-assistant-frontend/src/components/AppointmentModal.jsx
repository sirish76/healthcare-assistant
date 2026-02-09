import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  FileText,
  Shield,
  ExternalLink,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { getAvailableSlots, bookAppointment } from '../services/api';

function AppointmentModal({ doctor, onClose }) {
  const [step, setStep] = useState('select-time'); // select-time | fill-info | confirmed
  const [availableSlots, setAvailableSlots] = useState(doctor.availableSlots || []);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bookingUrl, setBookingUrl] = useState('');
  const [formData, setFormData] = useState({
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    reason: '',
    insurance: '',
  });

  useEffect(() => {
    // Fetch fresh slots from API
    const fetchSlots = async () => {
      try {
        const slots = await getAvailableSlots(doctor.id);
        if (slots && slots.length > 0) {
          setAvailableSlots(slots);
        }
      } catch (err) {
        console.error('Error fetching slots:', err);
      }
    };
    fetchSlots();
  }, [doctor.id]);

  const handleInputChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const result = await bookAppointment({
        doctorId: doctor.id,
        timeSlot: selectedSlot,
        ...formData,
      });
      setBookingUrl(result.bookingUrl || doctor.zocdocProfileUrl);
      setStep('confirmed');
    } catch (error) {
      console.error('Error booking:', error);
      // Fallback to ZocDoc profile
      setBookingUrl(doctor.zocdocProfileUrl || 'https://www.zocdoc.com');
      setStep('confirmed');
    } finally {
      setIsLoading(false);
    }
  };

  // Group slots by date
  const groupedSlots = {};
  availableSlots.forEach((slot) => {
    const dateKey = slot.split(' ')[0];
    if (!groupedSlots[dateKey]) groupedSlots[dateKey] = [];
    groupedSlots[dateKey].push(slot);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-teal-50">
          <div className="flex items-center gap-3">
            <img
              src={doctor.profileImageUrl}
              alt={`Dr. ${doctor.lastName}`}
              className="w-10 h-10 rounded-lg object-cover"
            />
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">
                Book with Dr. {doctor.firstName} {doctor.lastName}
              </h3>
              <p className="text-xs text-gray-500">{doctor.specialty}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/60 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-130px)] p-6">
          {step === 'select-time' && (
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
                <Calendar size={16} className="text-indigo-500" />
                Select an available time
              </h4>

              {Object.entries(groupedSlots).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No available slots found. Please try again later.
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedSlots).map(([date, slots]) => (
                    <div key={date}>
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        {formatDate(date)}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {slots.map((slot) => (
                          <button
                            key={slot}
                            onClick={() => setSelectedSlot(slot)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                              selectedSlot === slot
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-gray-50 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 border border-gray-200'
                            }`}
                          >
                            <Clock size={11} className="inline mr-1" />
                            {formatTime(slot)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setStep('fill-info')}
                disabled={!selectedSlot}
                className="w-full mt-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Continue
              </button>
            </div>
          )}

          {step === 'fill-info' && (
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
                <User size={16} className="text-indigo-500" />
                Your Information
              </h4>

              <div className="space-y-3">
                <InputField
                  icon={<User size={14} />}
                  name="patientName"
                  placeholder="Full Name"
                  value={formData.patientName}
                  onChange={handleInputChange}
                />
                <InputField
                  icon={<Mail size={14} />}
                  name="patientEmail"
                  placeholder="Email Address"
                  type="email"
                  value={formData.patientEmail}
                  onChange={handleInputChange}
                />
                <InputField
                  icon={<Phone size={14} />}
                  name="patientPhone"
                  placeholder="Phone Number"
                  type="tel"
                  value={formData.patientPhone}
                  onChange={handleInputChange}
                />
                <InputField
                  icon={<Shield size={14} />}
                  name="insurance"
                  placeholder="Insurance Provider"
                  value={formData.insurance}
                  onChange={handleInputChange}
                />
                <div className="relative">
                  <FileText
                    size={14}
                    className="absolute left-3 top-3 text-gray-400"
                  />
                  <textarea
                    name="reason"
                    placeholder="Reason for visit (optional)"
                    value={formData.reason}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 resize-none transition-all"
                  />
                </div>
              </div>

              {/* Selected time summary */}
              <div className="mt-4 p-3 bg-indigo-50 rounded-xl flex items-center gap-3">
                <Calendar size={16} className="text-indigo-600" />
                <div>
                  <p className="text-xs text-indigo-600 font-medium">Selected Appointment</p>
                  <p className="text-sm text-indigo-800 font-semibold">
                    {formatDateTime(selectedSlot)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep('select-time')}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!formData.patientName || !formData.patientEmail || isLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Booking...
                    </>
                  ) : (
                    'Confirm Booking'
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'confirmed' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">
                Appointment Request Sent!
              </h4>
              <p className="text-sm text-gray-500 mb-6">
                Your appointment request with Dr. {doctor.firstName} {doctor.lastName} has been submitted
                for <span className="font-medium text-gray-700">{formatDateTime(selectedSlot)}</span>.
              </p>

              {bookingUrl && (
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
                >
                  Complete on ZocDoc
                  <ExternalLink size={14} />
                </a>
              )}

              <button
                onClick={onClose}
                className="block w-full mt-4 py-3 text-gray-500 hover:text-gray-700 text-sm transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InputField({ icon, name, placeholder, type = 'text', value, onChange }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
      />
    </div>
  );
}

function formatDate(dateStr) {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(slot) {
  try {
    const timePart = slot.split(' ')[1];
    const [hours, minutes] = timePart.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return slot;
  }
}

function formatDateTime(slot) {
  try {
    const date = new Date(slot.replace(' ', 'T'));
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return slot;
  }
}

export default AppointmentModal;
