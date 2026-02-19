package com.healthassist.dto;

public class DoctorSearchRequest {

    private String specialty;
    private String location;
    private String insurance;
    private String doctorName;
    private int page;
    private int pageSize;

    public DoctorSearchRequest() {
    }

    public DoctorSearchRequest(String specialty, String location, String insurance,
                                String doctorName, int page, int pageSize) {
        this.specialty = specialty;
        this.location = location;
        this.insurance = insurance;
        this.doctorName = doctorName;
        this.page = page;
        this.pageSize = pageSize;
    }

    public String getSpecialty() {
        return specialty;
    }

    public void setSpecialty(String specialty) {
        this.specialty = specialty;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getInsurance() {
        return insurance;
    }

    public void setInsurance(String insurance) {
        this.insurance = insurance;
    }

    public String getDoctorName() {
        return doctorName;
    }

    public void setDoctorName(String doctorName) {
        this.doctorName = doctorName;
    }

    public int getPage() {
        return page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getPageSize() {
        return pageSize;
    }

    public void setPageSize(int pageSize) {
        this.pageSize = pageSize;
    }

    public static DoctorSearchRequestBuilder builder() {
        return new DoctorSearchRequestBuilder();
    }

    public static class DoctorSearchRequestBuilder {
        private String specialty;
        private String location;
        private String insurance;
        private String doctorName;
        private int page;
        private int pageSize;

        public DoctorSearchRequestBuilder specialty(String specialty) {
            this.specialty = specialty;
            return this;
        }

        public DoctorSearchRequestBuilder location(String location) {
            this.location = location;
            return this;
        }

        public DoctorSearchRequestBuilder insurance(String insurance) {
            this.insurance = insurance;
            return this;
        }

        public DoctorSearchRequestBuilder doctorName(String doctorName) {
            this.doctorName = doctorName;
            return this;
        }

        public DoctorSearchRequestBuilder page(int page) {
            this.page = page;
            return this;
        }

        public DoctorSearchRequestBuilder pageSize(int pageSize) {
            this.pageSize = pageSize;
            return this;
        }

        public DoctorSearchRequest build() {
            return new DoctorSearchRequest(specialty, location, insurance, doctorName, page, pageSize);
        }
    }
}
