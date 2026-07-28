export interface EmailTemplateData {
  customerName: string
  businessName: string
  date: string
  time: string
  duration: number
  notes?: string | null
  manageLink?: string | null
  dashboardLink?: string | null
  unsubscribeLink?: string | null
  previousDate?: string
  previousTime?: string
  feedbackLink?: string | null
  customerEmail?: string
  bookingReference?: string | number
  staffName?: string | null
  serviceName?: string | null
}

function baseLayout(title: string, headerColor: string, headerEmoji: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${headerColor}; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { color: white; margin: 0; font-size: 20px; }
    .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .details { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .details table { width: 100%; }
    .details td { padding: 8px; vertical-align: top; }
    .details td:first-child { font-weight: bold; width: 100px; }
    .button { display: inline-block; padding: 10px 20px; background-color: ${headerColor}; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px 0 0; }
    .footer { margin-top: 20px; font-size: 11px; text-align: center; color: #999; }
    .footer a { color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${headerEmoji} ${title}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated message from BookSure. Please do not reply to this email.</p>
      ${`<p><a href="${'{{unsubscribeLink}}'}">Unsubscribe from email notifications</a></p>`}
    </div>
  </div>
</body>
</html>`
}

function detailsTable(rows: [string, string | null | undefined][]): string {
  const filtered = rows.filter(([, val]) => val != null && val !== '')
  if (filtered.length === 0) return ''
  return `<div class="details"><table>${filtered
    .map(([label, val]) => `<tr><td>${label}</td><td>${val}</td></tr>`)
    .join('')}</table></div>`
}

function unsubscribeSection(unsubscribeLink: string | null): string {
  if (!unsubscribeLink) return ''
  return `<p style="margin-top: 16px; font-size: 11px; text-align: center; color: #999;">
    <a href="${unsubscribeLink}" style="color: #999;">Unsubscribe from email notifications</a>
  </p>`
}

export function bookingConfirmedTemplate(data: EmailTemplateData) {
  const content = `
    <p>Hello <strong>${data.customerName}</strong>,</p>
    <p>Your appointment with <strong>${data.businessName}</strong> has been confirmed.</p>
    ${detailsTable([
      ['📅 Date:', data.date],
      ['⏰ Time:', data.time],
      ['⏱️ Duration:', `${data.duration} minutes`],
      ['📝 Notes:', data.notes],
    ])}
    <div style="text-align: center; margin-top: 15px;">
      ${data.manageLink ? `<a href="${data.manageLink}" class="button">View / Edit Appointment</a>` : ''}
      ${data.dashboardLink ? `<a href="${data.dashboardLink}" class="button" style="background-color: #555;">My Appointments</a>` : ''}
    </div>
    <p style="margin-top: 20px;">Need to make changes? Use the links above to reschedule or cancel.</p>
  `
  return {
    subject: `Confirmed: ${data.businessName} – ${data.date} at ${data.time}`,
    html: baseLayout('Booking Confirmed!', '#4CAF50', '✅', content),
    text: `Booking Confirmed!\n\nHello ${data.customerName},\nYour appointment with ${data.businessName} has been confirmed.\n\nDate: ${data.date}\nTime: ${data.time}\nDuration: ${data.duration} minutes${data.notes ? `\nNotes: ${data.notes}` : ''}\n\n${data.manageLink ? `Manage: ${data.manageLink}` : ''}`,
  }
}

export function reminder24hTemplate(data: EmailTemplateData) {
  const content = `
    <p>Hello <strong>${data.customerName}</strong>,</p>
    <p>This is a friendly reminder that your appointment with <strong>${data.businessName}</strong> is <strong>tomorrow</strong>.</p>
    ${detailsTable([
      ['📅 Date:', data.date],
      ['⏰ Time:', data.time],
      ['⏱️ Duration:', `${data.duration} minutes`],
      ['📝 Notes:', data.notes],
    ])}
    <div style="text-align: center; margin-top: 15px;">
      ${data.manageLink ? `<a href="${data.manageLink}" class="button">View / Manage Appointment</a>` : ''}
    </div>
    <p style="margin-top: 16px; font-size: 13px; color: #666;">Need to reschedule or cancel? Use the link above to make changes before your appointment.</p>
  `
  return {
    subject: `Reminder: Appointment with ${data.businessName} tomorrow at ${data.time}`,
    html: baseLayout('Appointment Tomorrow', '#F59E0B', '🔔', content),
    text: `Appointment Reminder\n\nHello ${data.customerName},\nYour appointment with ${data.businessName} is tomorrow.\n\nDate: ${data.date}\nTime: ${data.time}\nDuration: ${data.duration} minutes\n\n${data.manageLink ? `Manage: ${data.manageLink}` : ''}`,
  }
}

export function reminder1hTemplate(data: EmailTemplateData) {
  const content = `
    <p>Hello <strong>${data.customerName}</strong>,</p>
    <p>Your appointment with <strong>${data.businessName}</strong> is in <strong>1 hour</strong>.</p>
    ${detailsTable([
      ['📅 Date:', data.date],
      ['⏰ Time:', data.time],
      ['⏱️ Duration:', `${data.duration} minutes`],
      ['📝 Notes:', data.notes],
    ])}
    <div style="text-align: center; margin-top: 15px;">
      ${data.manageLink ? `<a href="${data.manageLink}" class="button">View Appointment Details</a>` : ''}
    </div>
  `
  return {
    subject: `Starting soon: ${data.businessName} in 1 hour`,
    html: baseLayout('Appointment in 1 Hour', '#EF4444', '⏰', content),
    text: `Appointment Starting Soon\n\nHello ${data.customerName},\nYour appointment with ${data.businessName} is in 1 hour.\n\nDate: ${data.date}\nTime: ${data.time}\nDuration: ${data.duration} minutes\n\n${data.manageLink ? `Details: ${data.manageLink}` : ''}`,
  }
}

export function cancelledTemplate(data: EmailTemplateData) {
  const content = `
    <p>Hello <strong>${data.customerName}</strong>,</p>
    <p>Your appointment with <strong>${data.businessName}</strong> has been <strong>cancelled</strong>.</p>
    ${detailsTable([
      ['📅 Was:', `${data.date} at ${data.time}`],
      ['⏱️ Duration:', `${data.duration} minutes`],
    ])}
    <p style="margin-top: 16px;">You can book a new appointment anytime.</p>
  `
  return {
    subject: `Cancelled: ${data.businessName} – ${data.date} at ${data.time}`,
    html: baseLayout('Appointment Cancelled', '#6B7280', '❌', content),
    text: `Appointment Cancelled\n\nHello ${data.customerName},\nYour appointment with ${data.businessName} has been cancelled.\n\nWas: ${data.date} at ${data.time}\nDuration: ${data.duration} minutes`,
  }
}

export function rescheduledTemplate(data: EmailTemplateData) {
  const content = `
    <p>Hello <strong>${data.customerName}</strong>,</p>
    <p>Your appointment with <strong>${data.businessName}</strong> has been <strong>rescheduled</strong>.</p>
    ${detailsTable([
      ['📅 New Date:', data.date],
      ['⏰ New Time:', data.time],
      ['⏱️ Duration:', `${data.duration} minutes`],
    ])}
    ${data.previousDate ? `<p style="margin-top: 12px; font-size: 13px; color: #666;">Previous: ${data.previousDate} at ${data.previousTime}</p>` : ''}
    <div style="text-align: center; margin-top: 15px;">
      ${data.manageLink ? `<a href="${data.manageLink}" class="button">View Updated Appointment</a>` : ''}
    </div>
  `
  return {
    subject: `Rescheduled: ${data.businessName} – ${data.date} at ${data.time}`,
    html: baseLayout('Appointment Rescheduled', '#8B5CF6', '📅', content),
    text: `Appointment Rescheduled\n\nHello ${data.customerName},\nYour appointment with ${data.businessName} has been rescheduled.\n\nNew Date: ${data.date}\nNew Time: ${data.time}\nDuration: ${data.duration} minutes\n\n${data.manageLink ? `Details: ${data.manageLink}` : ''}`,
  }
}

export function thankYouTemplate(data: EmailTemplateData) {
  const content = `
    <p>Hello <strong>${data.customerName}</strong>,</p>
    <p>Thank you for your appointment with <strong>${data.businessName}</strong> today. We hope everything went well!</p>
    ${detailsTable([
      ['📅 Date:', data.date],
      ['⏰ Time:', data.time],
      ['⏱️ Duration:', `${data.duration} minutes`],
    ])}
    <p style="margin-top: 16px;">We look forward to seeing you again soon.</p>
  `
  return {
    subject: `Thank you from ${data.businessName}`,
    html: baseLayout('Thank You!', '#10B981', '🙏', content),
    text: `Thank You!\n\nHello ${data.customerName},\nThank you for your appointment with ${data.businessName} today. We hope everything went well!\n\nDate: ${data.date}\nTime: ${data.time}\nDuration: ${data.duration} minutes\n\nWe look forward to seeing you again soon.`,
  }
}

export function newBookingNotificationTemplate(data: EmailTemplateData) {
  const dashboardLink = data.dashboardLink || null
  const content = `
    <p>Hello <strong>${data.businessName}</strong>,</p>
    <p>You have received a <strong>new booking</strong>.</p>
    ${detailsTable([
      ['👤 Customer:', data.customerName],
      ['📧 Email:', data.customerEmail],
      ['🏢 Service:', data.serviceName || data.businessName],
      ['📅 Date:', data.date],
      ['⏰ Time:', data.time],
      ['⏱️ Duration:', `${data.duration} minutes`],
      ['👨‍💼 Staff:', data.staffName],
      ['🔖 Booking Ref:', data.bookingReference != null ? `#${data.bookingReference}` : undefined],
      ['📝 Notes:', data.notes],
    ])}
    <div style="text-align: center; margin-top: 15px;">
      ${dashboardLink ? `<a href="${dashboardLink}" class="button">View in Dashboard</a>` : ''}
    </div>
  `
  return {
    subject: `New booking: ${data.customerName} – ${data.date} at ${data.time}`,
    html: baseLayout('New Booking Received', '#2563EB', '📥', content),
    text: `New Booking Received\n\nHello ${data.businessName},\nYou have received a new booking.\n\nCustomer: ${data.customerName}\nEmail: ${data.customerEmail}\nService: ${data.serviceName || data.businessName}\nDate: ${data.date}\nTime: ${data.time}\nDuration: ${data.duration} minutes${data.staffName ? `\nStaff: ${data.staffName}` : ''}${data.bookingReference != null ? `\nBooking Ref: #${data.bookingReference}` : ''}${data.notes ? `\nNotes: ${data.notes}` : ''}\n\n${dashboardLink ? `View in Dashboard: ${dashboardLink}` : ''}`,
  }
}

export function feedbackRequestTemplate(data: EmailTemplateData) {
  const content = `
    <p>Hello <strong>${data.customerName}</strong>,</p>
    <p>Thank you for visiting <strong>${data.businessName}</strong> yesterday. We'd love to hear about your experience!</p>
    ${detailsTable([
      ['📅 Appointment:', `${data.date} at ${data.time}`],
    ])}
    ${data.feedbackLink ? `
    <div style="text-align: center; margin-top: 15px;">
      <a href="${data.feedbackLink}" class="button">Leave a Review</a>
    </div>` : ''}
    <p style="margin-top: 16px; font-size: 13px; color: #666;">Your feedback helps us serve you better. Thank you for taking the time!</p>
  `
  return {
    subject: `How was your visit to ${data.businessName}?`,
    html: baseLayout('We Value Your Feedback', '#3B82F6', '⭐', content),
    text: `We Value Your Feedback\n\nHello ${data.customerName},\nThank you for visiting ${data.businessName} yesterday. We'd love to hear about your experience!\n\nAppointment: ${data.date} at ${data.time}\n\n${data.feedbackLink ? `Leave a review: ${data.feedbackLink}` : 'Your feedback helps us serve you better.'}`,
  }
}
