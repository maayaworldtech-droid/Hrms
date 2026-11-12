import { OnDutyType } from '@/types';

/**
 * Reasons staff leave the center during a shift. One list for every screen, worded for a venue.
 * Codes are what is stored, so changing a label here never affects past requests.
 */
export const DUTY_TYPES: { value: OnDutyType; label: string; shortLabel: string; description: string }[] = [
  {
    value: 'BANK_DEPOSIT',
    label: 'Bank deposit',
    shortLabel: 'Bank deposit',
    description: "Depositing the center's cash collection, cheques or other bank work",
  },
  {
    value: 'PROCUREMENT',
    label: 'Buying supplies',
    shortLabel: 'Buying supplies',
    description: 'Buying spares, props, cleaning or event supplies for the center',
  },
  {
    value: 'CLIENT_VISIT',
    label: 'Booking or partner visit',
    shortLabel: 'Booking visit',
    description: 'Visiting schools, companies or event partners about bookings',
  },
  {
    value: 'DELIVERY',
    label: 'Pick-up or delivery',
    shortLabel: 'Pick-up / delivery',
    description: 'Collecting or dropping off goods, documents or equipment',
  },
  {
    value: 'OFFICIAL_ERRAND',
    label: 'Government or licence work',
    shortLabel: 'Government work',
    description: 'Licences, permits, police or municipal office visits',
  },
  {
    value: 'OTHER',
    label: 'Other work outside the center',
    shortLabel: 'Other',
    description: 'Any other work your manager has approved',
  },
];

export const dutyTypeLabel = (type?: OnDutyType | string): string =>
  DUTY_TYPES.find((d) => d.value === type)?.shortLabel || 'On Duty';
