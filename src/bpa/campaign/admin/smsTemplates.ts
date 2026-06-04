/** Default campaign SMS templates (mirrors backend sms.service defaults). */
export const CAMPAIGN_SMS_TEMPLATES = [
  {
    code: 'OTP',
    name: 'OTP verification',
    body: 'Your BPA vaccination code: {{otp}}. Valid for 5 minutes. Do not share.',
  },
  {
    code: 'BOOKING_CONFIRMED',
    name: 'Booking confirmed',
    body: 'BPA Vaccination: Booking confirmed! Ref: {{bookingRef}}. {{petName}} on {{date}} at {{location}}, {{time}}. Show this SMS at check-in.',
  },
  {
    code: 'REMINDER_24H',
    name: '24-hour reminder',
    body: 'BPA Vaccination Reminder: {{petName}} tomorrow at {{time}}. Location: {{location}}. Ref: {{bookingRef}}',
  },
  {
    code: 'REMINDER_2H',
    name: '2-hour reminder',
    body: 'BPA Vaccination: {{petName}} in 2 hours at {{location}}. Please arrive 10 min early. Ref: {{bookingRef}}',
  },
  {
    code: 'VACCINATION_COMPLETE',
    name: 'Vaccination complete',
    body: 'BPA Vaccination Complete! {{petName}} vaccinated. Certificate: {{certUrl}} Valid for 1 year.',
  },
  {
    code: 'BOOKING_CANCELLED',
    name: 'Booking cancelled',
    body: 'BPA Vaccination: Your booking ({{bookingRef}}) has been cancelled. Rebook at {{siteUrl}}',
  },
  {
    code: 'NO_SHOW',
    name: 'No-show notice',
    body: 'BPA Vaccination: You missed your appointment ({{bookingRef}}). Please rebook at {{siteUrl}}',
  },
  {
    code: 'ANNOUNCEMENT',
    name: 'Announcement',
    body: '{{message}}',
  },
] as const
