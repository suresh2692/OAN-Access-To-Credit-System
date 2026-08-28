import type { LucideIcon } from 'lucide-react';
import { type LoanApplicationFull } from '../api/loan.service';
import { GENDER_OPTIONS } from './loans.constants';

export type FarmerDetails = Record<string, string>;

export interface FieldConfig {
  key: string;
  label: string;
  apiKey: string;
  type?: 'text' | 'select';
  options?: typeof GENDER_OPTIONS;
  // Masked by default in the UI (e.g. National/Fayda ID); revealed on demand.
  sensitive?: boolean;
  // If the value from API is comma-separated, display it as a list of items
  isList?: boolean;
}

export interface SectionConfig {
  title: string;
  fields: FieldConfig[];
  gridCols?: string;
  icon?: LucideIcon;
  iconColor?: string;
}

export const FORM_SECTIONS: SectionConfig[] = [
  {
    title: 'Loan Details',
    gridCols: 'lg:grid-cols-3',
    fields: [
      { key: 'loanType', label: 'Loan Type', apiKey: 'loan_type' },
      { key: 'loanAmount', label: 'Loan Amount', apiKey: 'loan_amount' },
      { key: 'loanReason', label: 'Loan Reason', apiKey: 'loan_reason' },
    ],
  },
  {
    title: 'Basic Information',
    gridCols: 'lg:grid-cols-3',
    fields: [
      { key: 'firstName', label: 'First Name', apiKey: 'first_name' },
      { key: 'lastName', label: 'Last Name', apiKey: 'last_name' },
      { key: 'mobilePhone', label: 'Mobile Phone', apiKey: 'phone_number' },
      { key: 'dateOfBirth', label: 'Date of Birth', apiKey: 'date_of_birth' },
      { key: 'gender', label: 'Gender', apiKey: 'gender', type: 'select', options: GENDER_OPTIONS },
      { key: 'region', label: 'Region', apiKey: 'region' },
      { key: 'woreda', label: 'Woreda', apiKey: 'woreda' },
      { key: 'kebele', label: 'Kebele', apiKey: 'kebele' },
      { key: 'idType', label: 'ID Type', apiKey: 'id_type' },
      { key: 'idNumber', label: 'ID Number', apiKey: 'id_number', sensitive: true },
      { key: 'language', label: 'Language', apiKey: 'language' },
    ],
  },
  {
    title: 'Socio Economic Information',
    gridCols: 'lg:grid-cols-3',
    fields: [
      // { key: 'maritalStatus', label: 'Marital Status', apiKey: 'marital_status' },
      // { key: 'sizeOfFamily', label: 'Size of Family', apiKey: 'size_of_family' },
      { key: 'numberOfChildren', label: 'Number of Children', apiKey: 'number_of_children' },
      { key: 'noOfFemales', label: 'No. of Females (Family)', apiKey: 'no_of_females_family' },
      { key: 'noOfMales', label: 'No. of Males (Family)', apiKey: 'no_of_males_family' },
      { key: 'familyMemberOwnsLand', label: 'A Family Member Owns Land Independently', apiKey: 'family_member_owns_land_independently' },
      { key: 'sourceOfIncome', label: 'Source of Income', apiKey: 'source_of_income', isList: true },
      { key: 'educationLevel', label: 'Education Level', apiKey: 'education_level' },
    ],
  },
  {
    title: 'Land, Crop and Livestock Information',
    gridCols: 'lg:grid-cols-3',
    fields: [
      { key: 'totalFarmlandLandowner', label: 'Total Farmland Size as Landowner', apiKey: 'total_farmland_size_as_landowner' },
      { key: 'totalFarmlandCropSharing', label: 'Total Farmland Size as Crop Sharing', apiKey: 'total_farmland_size_as_crop_sharing' },
      { key: 'totalFarmlandRented', label: 'Total Farmland Size as Rented', apiKey: 'total_farmland_size_as_rented' },
      { key: 'certificationId', label: 'Certification ID', apiKey: 'certification_id', isList: true },
      // { key: 'certificationPhoto', label: 'Certification Photo', apiKey: 'certification_photo_url' },
    ],
  },
  {
    title: 'Agronomic Data',
    gridCols: 'lg:grid-cols-4',
    fields: [
      { key: 'farmlandSizeHectares', label: 'Farmland Size (Hectares)', apiKey: 'farmland_size_hectares', isList: true },
      { key: 'landOwnershipStatus', label: 'Land Ownership Status', apiKey: 'land_ownership_status' },
    ],
  },
];

export const DEFAULT_FARMER_DETAILS: FarmerDetails = FORM_SECTIONS.reduce<FarmerDetails>(
  (acc, section) => {
    section.fields.forEach((field) => { acc[field.key] = ''; });
    return acc;
  },
  {},
);

export function mapApiToFarmerDetails(data: LoanApplicationFull): FarmerDetails {
  const result: FarmerDetails = {};
  FORM_SECTIONS.forEach((section) => {
    section.fields.forEach((field) => {
      const val = data[field.apiKey as keyof LoanApplicationFull];
      if (typeof val === 'boolean') {
        result[field.key] = val ? 'Yes' : 'No';
      } else {
        result[field.key] = (val !== undefined && val !== null) ? String(val) : '';
      }
    });
  });
  return result;
}
