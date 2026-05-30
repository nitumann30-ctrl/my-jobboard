import companies from '@/data/companies.json'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import type { CompanyWatch } from '@/lib/types'
import { matchToRole, watchCompanies } from '@/lib/job-watchers'

function isAuthorized(request: Request) {
  const expected = process.env.JOB_WATCHER_WEBHOOK_SECRET
  if (!expected) return true

  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const url = new URL(request.url)
  const token = url.searchParams.get('token') || bearer

  return token === expected
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const requestedCompany = url.searchParams.get('company')?.toLowerCase() || ''
  const companyList = (companies as CompanyWatch[]).filter(company =>
    !requestedCompany || company.id === requestedCompany || company.name.toLowerCase() === requestedCompany
  )

  const results = await watchCompanies(companyList)
  const allMatches = results.flatMap(result => result.matches)
  const client = getSupabaseAdminClient()
  let persisted = false
  let insertedRoles = 0

  if (client && allMatches.length) {
    const rolePayload = allMatches.map(match => {
      const role = matchToRole(match)
      return {
        id: role.id,
        company_name: role.company,
        title: role.title,
        location: role.location,
        work_arrangement: role.workArrangement,
        salary_min: String(role.salaryMin ?? ''),
        salary_max: String(role.salaryMax ?? ''),
        source: role.source,
        job_url: role.jobUrl,
        industry: role.industry,
        company_stage: role.companyStage,
        experience_required: role.experienceRequired,
        visa_sponsorship: role.visaSponsorship,
        posted_date: role.postedDate,
        status: role.status,
        jd_text: role.jdText,
        fit_score: match.confidence
      }
    })

    const { error } = await client.from('roles').upsert(rolePayload)
    if (!error) {
      persisted = true
      insertedRoles = rolePayload.length
    }

    const runPayload = {
      id: `watch-${Date.now()}`,
      run_date: new Date().toISOString(),
      status: persisted ? 'Completed' : 'Completed without persistence',
      roles_found: results.length,
      qualified_roles: allMatches.length,
      roles_added: insertedRoles,
      public_contacts: 0,
      query: requestedCompany ? `Watcher run for ${requestedCompany}` : 'Watcher run for all configured Germany target companies',
      notes: results.map(result => `${result.company}: ${result.note}`).join(' | ')
    }
    await client.from('watcher_runs').insert(runPayload)
  }

  return Response.json({
    ok: true,
    mode: persisted ? 'supabase' : 'watch-only',
    checkedCompanies: companyList.length,
    totalMatches: allMatches.length,
    insertedRoles,
    results
  })
}
