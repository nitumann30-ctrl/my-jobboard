import { getSupabaseAdminClient } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  const body = await request.json()
  const client = getSupabaseAdminClient()

  if (!client) {
    return Response.json({ ok: false, mode: 'sample-data', error: 'Supabase is not configured yet.' }, { status: 503 })
  }

  const contactStatus = body.mode === 'email' ? 'Emailed' : body.mode === 'linkedin' ? 'Connection sent' : 'Replied'

  const { error: contactError } = await client
    .from('contacts')
    .update({ status: contactStatus })
    .eq('id', body.contact.id)

  if (contactError) {
    return Response.json({ ok: false, error: contactError.message }, { status: 500 })
  }

  const outreachPayload = {
    id: body.log.id,
    company_name: body.log.company,
    linked_role: body.log.role,
    contact_name: body.log.contact,
    date: body.log.date,
    channel: body.log.channel,
    message_type: body.log.type,
    status: body.log.status,
    follow_up_at: body.log.followUpDate,
    notes: body.log.notes
  }

  const { error: logError } = await client.from('outreach_logs').insert(outreachPayload)
  if (logError) {
    return Response.json({ ok: false, error: logError.message }, { status: 500 })
  }

  return Response.json({ ok: true, mode: 'supabase' })
}
