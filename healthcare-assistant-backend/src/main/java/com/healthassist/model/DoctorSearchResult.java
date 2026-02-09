package com.healthassist.model;

import java.util.List;

public class DoctorSearchResult {

    private List<Doctor> doctors;
    private String searchQuery;
    private String location;
    private String specialty;
    private int totalResults;

    public DoctorSearchResult() {
    }

    public DoctorSearchResult(List<Doctor> doctors, String searchQuery, String location,
                               String specialty, int totalResults) {
        this.doctors = doctors;
        this.searchQuery = searchQuery;
        this.location = location;
        this.specialty = specialty;
        this.totalResults = totalResults;
    }

    public List<Doctor> getDoctors() {
        return doctors;
    }

    public void setDoctors(List<Doctor> doctors) {
        this.doctors = doctors;
    }

    public String getSearchQuery() {
        return searchQuery;
    }

    public void setSearchQuery(String searchQuery) {
        this.searchQuery = searchQuery;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getSpecialty() {
        return specialty;
    }

    public void setSpecialty(String specialty) {
        this.specialty = specialty;
    }

    public int getTotalResults() {
        return totalResults;
    }

    public void setTotalResults(int totalResults) {
        this.totalResults = totalResults;
    }

    public static DoctorSearchResultBuilder builder() {
        return new DoctorSearchResultBuilder();
    }

    public static class DoctorSearchResultBuilder {
        private List<Doctor> doctors;
        private String searchQuery;
        private String location;
        private String specialty;
        private int totalResults;

        public DoctorSearchResultBuilder doctors(List<Doctor> doctors) {
            this.doctors = doctors;
            return this;
        }

        public DoctorSearchResultBuilder searchQuery(String searchQuery) {
            this.searchQuery = searchQuery;
            return this;
        }

        public DoctorSearchResultBuilder location(String location) {
            this.location = location;
            return this;
        }

        public DoctorSearchResultBuilder specialty(String specialty) {
            this.specialty = specialty;
            return this;
        }

        public DoctorSearchResultBuilder totalResults(int totalResults) {
            this.totalResults = totalResults;
            return this;
        }

        public DoctorSearchResult build() {
            return new DoctorSearchResult(doctors, searchQuery, location, specialty, totalResults);
        }
    }
}
