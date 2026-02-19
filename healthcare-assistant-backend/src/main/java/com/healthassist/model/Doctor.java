package com.healthassist.model;

import java.util.List;

public class Doctor {

    private String id;
    private String firstName;
    private String lastName;
    private String specialty;
    private String profileImageUrl;
    private String practiceName;
    private Address address;
    private double rating;
    private int reviewCount;
    private List<String> insurancesAccepted;
    private List<String> availableSlots;
    private String zocdocProfileUrl;
    private boolean acceptingNewPatients;

    public Doctor() {
    }

    public Doctor(String id, String firstName, String lastName, String specialty,
                  String profileImageUrl, String practiceName, Address address,
                  double rating, int reviewCount, List<String> insurancesAccepted,
                  List<String> availableSlots, String zocdocProfileUrl, boolean acceptingNewPatients) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.specialty = specialty;
        this.profileImageUrl = profileImageUrl;
        this.practiceName = practiceName;
        this.address = address;
        this.rating = rating;
        this.reviewCount = reviewCount;
        this.insurancesAccepted = insurancesAccepted;
        this.availableSlots = availableSlots;
        this.zocdocProfileUrl = zocdocProfileUrl;
        this.acceptingNewPatients = acceptingNewPatients;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getSpecialty() {
        return specialty;
    }

    public void setSpecialty(String specialty) {
        this.specialty = specialty;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public void setProfileImageUrl(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }

    public String getPracticeName() {
        return practiceName;
    }

    public void setPracticeName(String practiceName) {
        this.practiceName = practiceName;
    }

    public Address getAddress() {
        return address;
    }

    public void setAddress(Address address) {
        this.address = address;
    }

    public double getRating() {
        return rating;
    }

    public void setRating(double rating) {
        this.rating = rating;
    }

    public int getReviewCount() {
        return reviewCount;
    }

    public void setReviewCount(int reviewCount) {
        this.reviewCount = reviewCount;
    }

    public List<String> getInsurancesAccepted() {
        return insurancesAccepted;
    }

    public void setInsurancesAccepted(List<String> insurancesAccepted) {
        this.insurancesAccepted = insurancesAccepted;
    }

    public List<String> getAvailableSlots() {
        return availableSlots;
    }

    public void setAvailableSlots(List<String> availableSlots) {
        this.availableSlots = availableSlots;
    }

    public String getZocdocProfileUrl() {
        return zocdocProfileUrl;
    }

    public void setZocdocProfileUrl(String zocdocProfileUrl) {
        this.zocdocProfileUrl = zocdocProfileUrl;
    }

    public boolean isAcceptingNewPatients() {
        return acceptingNewPatients;
    }

    public void setAcceptingNewPatients(boolean acceptingNewPatients) {
        this.acceptingNewPatients = acceptingNewPatients;
    }

    public static DoctorBuilder builder() {
        return new DoctorBuilder();
    }

    public static class DoctorBuilder {
        private String id;
        private String firstName;
        private String lastName;
        private String specialty;
        private String profileImageUrl;
        private String practiceName;
        private Address address;
        private double rating;
        private int reviewCount;
        private List<String> insurancesAccepted;
        private List<String> availableSlots;
        private String zocdocProfileUrl;
        private boolean acceptingNewPatients;

        public DoctorBuilder id(String id) {
            this.id = id;
            return this;
        }

        public DoctorBuilder firstName(String firstName) {
            this.firstName = firstName;
            return this;
        }

        public DoctorBuilder lastName(String lastName) {
            this.lastName = lastName;
            return this;
        }

        public DoctorBuilder specialty(String specialty) {
            this.specialty = specialty;
            return this;
        }

        public DoctorBuilder profileImageUrl(String profileImageUrl) {
            this.profileImageUrl = profileImageUrl;
            return this;
        }

        public DoctorBuilder practiceName(String practiceName) {
            this.practiceName = practiceName;
            return this;
        }

        public DoctorBuilder address(Address address) {
            this.address = address;
            return this;
        }

        public DoctorBuilder rating(double rating) {
            this.rating = rating;
            return this;
        }

        public DoctorBuilder reviewCount(int reviewCount) {
            this.reviewCount = reviewCount;
            return this;
        }

        public DoctorBuilder insurancesAccepted(List<String> insurancesAccepted) {
            this.insurancesAccepted = insurancesAccepted;
            return this;
        }

        public DoctorBuilder availableSlots(List<String> availableSlots) {
            this.availableSlots = availableSlots;
            return this;
        }

        public DoctorBuilder zocdocProfileUrl(String zocdocProfileUrl) {
            this.zocdocProfileUrl = zocdocProfileUrl;
            return this;
        }

        public DoctorBuilder acceptingNewPatients(boolean acceptingNewPatients) {
            this.acceptingNewPatients = acceptingNewPatients;
            return this;
        }

        public Doctor build() {
            return new Doctor(id, firstName, lastName, specialty, profileImageUrl, practiceName,
                    address, rating, reviewCount, insurancesAccepted, availableSlots,
                    zocdocProfileUrl, acceptingNewPatients);
        }
    }

    public static class Address {
        private String street;
        private String city;
        private String state;
        private String zipCode;
        private double latitude;
        private double longitude;

        public Address() {
        }

        public Address(String street, String city, String state, String zipCode,
                       double latitude, double longitude) {
            this.street = street;
            this.city = city;
            this.state = state;
            this.zipCode = zipCode;
            this.latitude = latitude;
            this.longitude = longitude;
        }

        public String getStreet() {
            return street;
        }

        public void setStreet(String street) {
            this.street = street;
        }

        public String getCity() {
            return city;
        }

        public void setCity(String city) {
            this.city = city;
        }

        public String getState() {
            return state;
        }

        public void setState(String state) {
            this.state = state;
        }

        public String getZipCode() {
            return zipCode;
        }

        public void setZipCode(String zipCode) {
            this.zipCode = zipCode;
        }

        public double getLatitude() {
            return latitude;
        }

        public void setLatitude(double latitude) {
            this.latitude = latitude;
        }

        public double getLongitude() {
            return longitude;
        }

        public void setLongitude(double longitude) {
            this.longitude = longitude;
        }

        public static AddressBuilder builder() {
            return new AddressBuilder();
        }

        public static class AddressBuilder {
            private String street;
            private String city;
            private String state;
            private String zipCode;
            private double latitude;
            private double longitude;

            public AddressBuilder street(String street) {
                this.street = street;
                return this;
            }

            public AddressBuilder city(String city) {
                this.city = city;
                return this;
            }

            public AddressBuilder state(String state) {
                this.state = state;
                return this;
            }

            public AddressBuilder zipCode(String zipCode) {
                this.zipCode = zipCode;
                return this;
            }

            public AddressBuilder latitude(double latitude) {
                this.latitude = latitude;
                return this;
            }

            public AddressBuilder longitude(double longitude) {
                this.longitude = longitude;
                return this;
            }

            public Address build() {
                return new Address(street, city, state, zipCode, latitude, longitude);
            }
        }
    }
}
