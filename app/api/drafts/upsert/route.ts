import { getSupabaseAdminClient } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  const body = await request.json()
  const client = getSupabaseAdminClient()

  if (!client) {
    return Response.json({ ok: false, mode: 'sample-data', error: 'Supabase is not configured yet.' }, { status: 503 })
  }

  const payload = {
    id: body.id,
    company_name: body.company,
    contact_name: body.contactName,
    contact_title: body.contactTitle ?? '',
    linkedin: body.linkedin ?? '',
    email: body.email ?? '',
    email_subject: body.emailSubject ?? '',
    email_body: body.emailBody ?? '',
    linkedin_note: body.linkedinNote ?? '',
    personalization_line: body.personalizationLine ?? ''
  }

  const { error } = await client.from('message_drafts').upsert(payload)
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, mode: 'supabase' })
}
