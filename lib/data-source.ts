import { companies, contacts, drafts, outreach, roles, runs } from '@/lib/sample-data'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import type { CompanyWatch, Contact, JobRole, MessageDraft, OutreachLog, WatcherRun } from '@/lib/types'

function normalizeRole(row: any): JobRole {
  return {
    id: row.id,
    company: row.company_name ?? row.company,
    title: row.title,
    location: row.location ?? '',
    workArrangement: row.work_arrangement ?? row.workArrangement ?? '',
    salaryMin: row.salary_min ?? row.salaryMin ?? '',
    salaryMax: row.salary_max ?? row.salaryMax ?? '',
    source: row.source ?? '',
    jobUrl: row.job_url ?? row.jobUrl ?? '',
    industry: row.industry ?? '',
    companyStage: row.company_stage ?? row.companyStage ?? '',
    experienceRequired: row.experience_required ?? row.experienceRequired ?? '',
    visaSponsorship: row.visa_sponsorship ?? row.visaSponsorship ?? '',
    postedDate: row.posted_date ?? row.postedDate ?? '',
    status: row.status ?? 'To Apply',
    jdText: row.jd_text ?? row.jdText ?? ''
  }
}

function normalizeContact(row: any): Contact {
  return {
    id: row.id,
    company: row.company_name ?? row.company,
    role: row.linked_role ?? row.role ?? '',
    name: row.name,
    title: row.title ?? '',
    linkedin: row.linkedin ?? '',
    email: row.email ?? '',
    status: row.status ?? 'Researching',
    source: row.source ?? '',
    notes: row.notes ?? ''
  }
}

function normalizeDraft(row: any): MessageDraft {
  return {
    id: row.id,
    company: row.company_name ?? row.company,
    contactName: row.contact_name ?? row.contactName,
    contactTitle: row.contact_title ?? row.contactTitle ?? '',
    linkedin: row.linkedin ?? '',
    email: row.email ?? '',
    personalizationLine: row.personalization_line ?? row.personalizationLine ?? '',
    emailSubject: row.email_subject ?? row.emailSubject ?? '',
    emailBody: row.email_body ?? row.emailBody ?? '',
    linkedinNote: row.linkedin_note ?? row.linkedinNote ?? ''
  }
}

function normalizeOutreach(row: any): OutreachLog {
  return {
    id: row.id,
    company: row.company_name ?? row.company,
    role: row.linked_role ?? row.role ?? '',
    contact: row.contact_name ?? row.contact ?? '',
    date: row.date ?? row.sent_at?.slice(0, 10) ?? '',
    channel: row.channel ?? '',
    type: row.message_type ?? row.type ?? '',
    status: row.status ?? '',
    followUpDate: row.follow_up_at?.slice(0, 10) ?? row.followUpDate ?? '',
    notes: row.notes ?? ''
  }
}

function normalizeCompany(row: any): CompanyWatch {
  return {
    id: row.id,
    name: row.name,
    website: row.website ?? '',
    careersUrl: row.careers_url ?? row.careersUrl ?? '',
    whyFit: row.why_fit ?? row.whyFit ?? '',
    currentFocus: row.current_focus ?? row.currentFocus ?? '',
    personalizationAngle: row.personalization_angle ?? row.personalizationAngle ?? '',
    hiringStatus: row.hiring_status ?? row.hiringStatus ?? '',
    notes: row.notes ?? ''
  }
}

function normalizeRun(row: any): WatcherRun {
  return {
    id: row.id,
    runDate: row.run_date ?? row.runDate ?? '',
    status: row.status ?? '',
    rolesFound: row.roles_found ?? row.rolesFound ?? 0,
    qualifiedRoles: row.qualified_roles ?? row.qualifiedRoles ?? 0,
    rolesAdded: row.roles_added ?? row.rolesAdded ?? 0,
    publicContacts: row.public_contacts ?? row.publicContacts ?? 0,
    query: row.query ?? '',
    notes: row.notes ?? ''
  }
}

export async function getInitialData() {
  const client = getSupabaseAdminClient()
  if (!client) {
    return { roles, contacts, outreach, drafts, companies, runs, mode: 'sample-data' as const }
  }

  try {
    const [rolesRes, contactsRes, outreachRes, draftsRes, companiesRes, runsRes] = await Promise.all([
      client.from('roles').select('*').order('created_at', { ascending: false }),
      client.from('contacts').select('*').order('created_at', { ascending: false }),
      client.from('outreach_logs').select('*').order('created_at', { ascending: false }),
      client.from('message_drafts').select('*').order('updated_at', { ascending: false }),
      client.from('companies').select('*').order('name', { ascending: true }),
      client.from('watcher_runs').select('*').order('run_date', { ascending: false })
    ])

    const hasError = [rolesRes, contactsRes, outreachRes, draftsRes, companiesRes, runsRes].some(r => r.error)
    if (hasError) throw new Error('Supabase query error')

    return {
      roles: (rolesRes.data ?? []).map(normalizeRole),
      contacts: (contactsRes.data ?? []).map(normalizeContact),
      outreach: (outreachRes.data ?? []).map(normalizeOutreach),
      drafts: (draftsRes.data ?? []).map(normalizeDraft),
      companies: (companiesRes.data ?? []).map(normalizeCompany),
      runs: (runsRes.data ?? []).map(normalizeRun),
      mode: 'supabase' as const
    }
  } catch {
    return { roles, contacts, outreach, drafts, companies, runs, mode: 'sample-data-fallback' as const }
  }
}
