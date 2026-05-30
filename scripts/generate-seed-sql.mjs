import fs from 'node:fs/promises'
import path from 'node:path'

const tables = [
  ['companies', 'companies.json', ['id','name','website','careers_url','why_fit','current_focus','personalization_angle','hiring_status','notes']],
  ['roles', 'roles.json', ['id','company_name','title','location','work_arrangement','salary_min','salary_max','source','job_url','industry','company_stage','experience_required','visa_sponsorship','posted_date','status','jd_text']],
  ['contacts', 'contacts.json', ['id','company_name','linked_role','name','title','linkedin','email','status','source','notes']],
  ['message_drafts', 'drafts.json', ['id','company_name','contact_name','contact_title','linkedin','email','email_subject','email_body','linkedin_note','personalization_line']],
  ['outreach_logs', 'outreach.json', ['id','company_name','linked_role','contact_name','date','channel','message_type','status','follow_up_at','notes']],
  ['watcher_runs', 'runs.json', ['id','run_date','status','roles_found','qualified_roles','roles_added','public_contacts','query','notes']]
]

function mapRow(table, row) {
  if (table === 'companies') return {
    id: row.id, name: row.name, website: row.website || '', careers_url: row.careersUrl || '', why_fit: row.whyFit || '', current_focus: row.currentFocus || '', personalization_angle: row.personalizationAngle || '', hiring_status: row.hiringStatus || '', notes: row.notes || ''
  }
  if (table === 'roles') return {
    id: row.id, company_name: row.company, title: row.title, location: row.location || '', work_arrangement: row.workArrangement || '', salary_min: String(row.salaryMin ?? ''), salary_max: String(row.salaryMax ?? ''), source: row.source || '', job_url: row.jobUrl || '', industry: row.industry || '', company_stage: row.companyStage || '', experience_required: row.experienceRequired || '', visa_sponsorship: row.visaSponsorship || '', posted_date: row.postedDate || '', status: row.status || '', jd_text: row.jdText || ''
  }
  if (table === 'contacts') return {
    id: row.id, company_name: row.company, linked_role: row.role || '', name: row.name, title: row.title || '', linkedin: row.linkedin || '', email: row.email || '', status: row.status || '', source: row.source || '', notes: row.notes || ''
  }
  if (table === 'message_drafts') return {
    id: row.id, company_name: row.company, contact_name: row.contactName, contact_title: row.contactTitle || '', linkedin: row.linkedin || '', email: row.email || '', email_subject: row.emailSubject || '', email_body: row.emailBody || '', linkedin_note: row.linkedinNote || '', personalization_line: row.personalizationLine || ''
  }
  if (table === 'outreach_logs') return {
    id: row.id, company_name: row.company, linked_role: row.role || '', contact_name: row.contact || '', date: row.date || '', channel: row.channel || '', message_type: row.type || '', status: row.status || '', follow_up_at: row.followUpDate || '', notes: row.notes || ''
  }
  return {
    id: row.id, run_date: row.runDate || '', status: row.status || '', roles_found: row.rolesFound ?? 0, qualified_roles: row.qualifiedRoles ?? 0, roles_added: row.rolesAdded ?? 0, public_contacts: row.publicContacts ?? 0, query: row.query || '', notes: row.notes || ''
  }
}

function sqlValue(value) {
  if (value === null || value === undefined) return 'null'
  const stringValue = String(value)
  return `'${stringValue.replaceAll("'", "''")}'`
}

async function main() {
  const dataDir = path.join(process.cwd(), 'data')
  let sql = '-- Generated seed SQL

'

  for (const [table, fileName, columns] of tables) {
    const raw = JSON.parse(await fs.readFile(path.join(dataDir, fileName), 'utf8'))
    const mappedRows = raw.map(row => mapRow(table, row))
    for (const row of mappedRows) {
      sql += `insert into ${table} (${columns.join(', ')}) values (${columns.map(column => sqlValue(row[column])).join(', ')}) on conflict (id) do update set ${columns.filter(column => column !== 'id').map(column => `${column} = excluded.${column}`).join(', ')};
`
    }
    sql += '
'
  }

  await fs.writeFile(path.join(process.cwd(), 'supabase', 'seed.sql'), sql, 'utf8')
  console.log('Generated supabase/seed.sql')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
