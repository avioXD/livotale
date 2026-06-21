# Patient Phone Verification — Implementation Plan

## Phase 1: Backend core

1. Add `PURPOSE_OPERATOR_INTAKE` to OTP service
2. Add `PatientRegistryService.commit_verified_phone_for_order`
3. Extract shared OTP helpers (send/verify)
4. Fix technician send/verify to use body phone + commit on verify
5. Add operator OTP send/verify endpoints
6. Add `patient_intake_verified` workflow trigger

## Phase 2: Frontend

1. TechnicianPatientIntakePanel — pass phone to send OTP, reset on phone change
2. OrderPatientIntakePanel — OTP block for phone verify
3. TechnicianOrderService — operator OTP methods
4. PatientLoginPage — OTP-only

## Phase 3: Tests & docs

1. Integration tests for commit, 409, notifications
2. Update contract/e2e tests
3. Update otp-security, patient-portal, technician specs
