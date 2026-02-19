import React, { useState } from 'react';
import {
  MapPin,
  Star,
  Clock,
  Shield,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import AppointmentModal from './AppointmentModal';

function DoctorResults({ results }) {
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showModal, setShowModal] = useState(false);

  if (!results || !results.doctors || results.doctors.length === 0) {
    return (
      <div className="ml-11 mt-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        No doctors found matching your search. Try adjusting your location or specialty.
      </div>
    );
  }

  const handleBookAppointment = (doctor) => {
    setSelectedDoctor(doctor);
    setShowModal(true);
  };

  return (
    <div className="ml-11 mt-3 animate-slide-up">
      {/* Results header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md bg-teal-100 flex items-center justify-center">
          <MapPin size={13} className="text-teal-600" />
        </div>
        <p className="text-sm font-medium text-gray-700">
          {results.totalResults} {results.specialty} doctor{results.totalResults !== 1 ? 's' : ''} near{' '}
          <span className="text-indigo-600">{results.location}</span>
        </p>
      </div>

      {/* Doctor Cards */}
      <div className="space-y-3">
        {results.doctors.map((doctor) => (
          <DoctorCard
            key={doctor.id}
            doctor={doctor}
            onBookAppointment={() => handleBookAppointment(doctor)}
          />
        ))}
      </div>

      {/* Appointment Modal */}
      {showModal && selectedDoctor && (
        <AppointmentModal
          doctor={selectedDoctor}
          onClose={() => {
            setShowModal(false);
            setSelectedDoctor(null);
          }}
        />
      )}
    </div>
  );
}

function DoctorCard({ doctor, onBookAppointment }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-indigo-200 hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Main card content */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <img
            src={doctor.profileImageUrl}
            alt={`Dr. ${doctor.firstName} ${doctor.lastName}`}
            className="w-14 h-14 rounded-xl object-cover shadow-sm"
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-gray-800 text-sm">
                  Dr. {doctor.firstName} {doctor.lastName}
                </h4>
                <p className="text-xs text-indigo-600 font-medium">{doctor.specialty}</p>
                <p className="text-xs text-gray-500 mt-0.5">{doctor.practiceName}</p>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg shrink-0">
                <Star size={12} className="text-amber-500 fill-amber-500" />
                <span className="text-xs font-semibold text-amber-700">{doctor.rating}</span>
                <span className="text-xs text-amber-600">({doctor.reviewCount})</span>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
              <MapPin size={11} />
              <span>
                {doctor.address.street}, {doctor.address.city}, {doctor.address.state}{' '}
                {doctor.address.zipCode}
              </span>
            </div>

            {/* Status & Actions */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3">
                {doctor.acceptingNewPatients ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                    <CheckCircle2 size={11} />
                    Accepting patients
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-1 rounded-md">
                    <XCircle size={11} />
                    Not accepting
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                >
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {expanded ? 'Less' : 'More'}
                </button>
                <button
                  onClick={onBookAppointment}
                  disabled={!doctor.acceptingNewPatients}
                  className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-xs font-medium rounded-lg hover:from-indigo-700 hover:to-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Book Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
            {/* Insurance accepted */}
            {doctor.insurancesAccepted && doctor.insurancesAccepted.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield size={12} className="text-indigo-500" />
                  <span className="text-xs font-semibold text-gray-700">Insurance Accepted</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {doctor.insurancesAccepted.map((ins, i) => (
                    <span
                      key={i}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md"
                    >
                      {ins}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Next available slots */}
            {doctor.availableSlots && doctor.availableSlots.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock size={12} className="text-teal-500" />
                  <span className="text-xs font-semibold text-gray-700">Next Available</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {doctor.availableSlots.slice(0, 4).map((slot, i) => (
                    <span
                      key={i}
                      className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md"
                    >
                      {formatSlot(slot)}
                    </span>
                  ))}
                  {doctor.availableSlots.length > 4 && (
                    <span className="text-xs text-gray-400">
                      +{doctor.availableSlots.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatSlot(slot) {
  try {
    const date = new Date(slot.replace(' ', 'T'));
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return slot;
  }
}

export default DoctorResults;
