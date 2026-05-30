export type JobRole = {
  id: string
  company: string
  title: string
  location: string
  workArrangement: string
  salaryMin?: number | string
  salaryMax?: number | string
  source: string
  jobUrl: string
  industry: string
  companyStage: string
  experienceRequired: string
  visaSponsorship: string
  postedDate: string
  status: string
  jdText: string
}

export type Contact = {
  id: string
  company: string
  role: string
  name: string
  title: string
  linkedin: string
  email: string
  status: string
  source: string
  notes: string
}

export type OutreachLog = {
  id: string
  company: string
  role: string
  contact: string
  date: string
  channel: string
  type: string
  status: string
  followUpDate: string
  notes: string
}

export type MessageDraft = {
  id: string
  company: string
  contactName: string
  contactTitle: string
  linkedin: string
  email: string
  personalizationLine: string
  emailSubject: string
  emailBody: string
  linkedinNote: string
}

export type CompanyWatch = {
  id: string
  name: string
  website: string
  careersUrl: string
  whyFit: string
  currentFocus: string
  personalizationAngle: string
  hiringStatus: string
  notes: string
}

export type WatcherRun = {
  id: string
  runDate: string
  status: string
  rolesFound: number
  qualifiedRoles: number
  rolesAdded: number
  publicContacts: number
  query: string
  notes: string
}
