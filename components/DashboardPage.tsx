'use client'

import { useMemo, useState } from 'react'
import type { CompanyWatch, Contact, JobRole, MessageDraft, OutreachLog, WatcherRun } from '@/lib/types'

type Props = {
  roles: JobRole[]
  contacts: Contact[]
  outreach: OutreachLog[]
  drafts: MessageDraft[]
  companies: CompanyWatch[]
  runs: WatcherRun[]
  dataMode: 'supabase' | 'sample-data' | 'sample-data-fallback'
}

function score(role: JobRole) {
  const title = role.title.toLowerCase()
  let total = 0
  if (title.includes('people partner') || title.includes('hr business partner')) total += 30
  if (title.includes('wellbeing') || title.includes('culture') || title.includes('organizational')) total += 18
  if ((role.location || '').toLowerCase().includes('germany') || (role.location || '').toLowerCase().includes('berlin')) total += 18
  if ((role.companyStage || '').toLowerCase().includes('growth') || (role.companyStage || '').toLowerCase().includes('high-growth')) total += 18
  if ((role.experienceRequired || '').toLowerCase().includes('2+') || (role.experienceRequired || '').toLowerCase().includes('junior')) total += 8
  return Math.min(100, total)
}

export default function DashboardPage({ roles, contacts, outreach, drafts, companies, runs, dataMode }: Props) {
  const [selectedCompany, setSelectedCompany] = useState<string>('all')
  const [showEmailOnly, setShowEmailOnly] = useState(false)
  const [studioContactId, setStudioContactId] = useState<string>(contacts[0]?.id ?? '')
  const [localDrafts, setLocalDrafts] = useState<MessageDraft[]>(drafts)
  const [localContacts, setLocalContacts] = useState<Contact[]>(contacts)
  const [localOutreach, setLocalOutreach] = useState<OutreachLog[]>(outreach)

  const filteredContacts = useMemo(() => {
    return localContacts.filter(contact => {
      const companyMatch = selectedCompany === 'all' || contact.company === selectedCompany
      const emailMatch = !showEmailOnly || Boolean(contact.email)
      return companyMatch && emailMatch
    })
  }, [localContacts, selectedCompany, showEmailOnly])

  const selectedContact = filteredContacts.find(c => c.id === studioContactId) || filteredContacts[0] || null
  const selectedDraft = selectedContact
    ? localDrafts.find(d => d.company === selectedContact.company && d.contactName === selectedContact.name)
    : null

  const [draftState, setDraftState] = useState<MessageDraft | null>(selectedDraft ?? null)

  const syncDraft = (contact: Contact | null) => {
    if (!contact) {
      setDraftState(null)
      return
    }
    const draft = localDrafts.find(d => d.company === contact.company && d.contactName === contact.name)
    if (draft) {
      setDraftState(draft)
      setStudioContactId(contact.id)
      return
    }
    const generated: MessageDraft = {
      id: `draft-${contact.id}`,
      company: contact.company,
      contactName: contact.name,
      contactTitle: contact.title,
      linkedin: contact.linkedin,
      email: contact.email,
      personalizationLine: contact.notes,
      emailSubject: `${contact.company}: a practical people-performance angle`,
      emailBody: `Hi ${contact.name.split(' ')[0]},

I'm reaching out because your work at ${contact.company} stood out to me. I'm an M.Sc. Clinical Psychologist focused on evidence-based workshops for high-pressure teams.

I developed an 8-session protocol that reduced clinical anxiety by 44.5% and workplace stress by 40%. I'd love to share how I'd apply that lens in your context.

Best,
Nitu Mann`,
      linkedinNote: `Hi ${contact.name.split(' ')[0]}, your work at ${contact.company} stood out to me. I focus on evidence-based workshops for high-pressure teams and would love to connect.`
    }
    setLocalDrafts(prev => [generated, ...prev])
    setDraftState(generated)
    setStudioContactId(contact.id)
  }

  const studioIndex = filteredContacts.findIndex(c => c.id === selectedContact?.id)
  const qualifiedCount = roles.filter(role => score(role) >= 70).length

  function onSelectContact(contactId: string) {
    const nextContact = filteredContacts.find(c => c.id === contactId) || null
    setStudioContactId(contactId)
    syncDraft(nextContact)
  }

  function navigate(delta: number) {
    if (!filteredContacts.length) return
    const current = studioIndex >= 0 ? studioIndex : 0
    const next = (current + delta + filteredContacts.length) % filteredContacts.length
    onSelectContact(filteredContacts[next].id)
  }

  function saveDraft() {
    if (!draftState) return
    setLocalDrafts(prev => {
      const idx = prev.findIndex(d => d.id === draftState.id)
      if (idx >= 0) {
        const clone = [...prev]
        clone[idx] = draftState
        return clone
      }
      return [draftState, ...prev]
    })
    alert('Draft saved locally in the running app. Next step: connect to Supabase persistence.')
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text)
  }

  async function markStatus(mode: 'email' | 'linkedin' | 'reply') {
    if (!selectedContact || !draftState) return
    const nextContactStatus = mode === 'email' ? 'Emailed' : mode === 'linkedin' ? 'Connection sent' : 'Replied'
    const log = {
      id: `log-${Date.now()}-${mode}`,
      company: selectedContact.company,
      role: selectedContact.role,
      contact: selectedContact.name,
      date: new Date().toISOString().slice(0, 10),
      channel: mode === 'email' ? 'Email' : 'LinkedIn',
      type: mode === 'reply' ? 'Reply received' : mode === 'email' ? 'Cold email' : 'Connection request',
      status: mode === 'reply' ? 'Replied' : 'Sent',
      followUpDate: '',
      notes: mode === 'email' ? `Subject: ${draftState.emailSubject}

${draftState.emailBody}` : draftState.linkedinNote
    }

    setLocalContacts(prev => prev.map(contact => contact.id === selectedContact.id ? { ...contact, status: nextContactStatus } : contact))
    setLocalOutreach(prev => [log, ...prev])

    try {
      const response = await fetch('/api/outreach/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, contact: selectedContact, log })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to write outreach status')
    } catch {
      alert('Status updated in the UI state, but Supabase is not configured yet or the request failed.')
    }
  }

  const companiesInContacts = Array.from(new Set(localContacts.map(c => c.company))).sort()

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Full web app version</p>
          <h1>Nitu Mann | Job Search Operating System</h1>
          <p className="hero-copy">Next.js + Supabase architecture, local-first and Vercel-ready. This scaffold turns your standalone board into a proper web app with jobs, contacts, company watchlist, message studio, and 24/7 watcher blueprint.</p>
          <p className="hero-copy"><strong>Data mode:</strong> {dataMode === 'supabase' ? 'Live Supabase data' : dataMode === 'sample-data-fallback' ? 'Sample data fallback because Supabase failed' : 'Sample data only until Supabase is configured'}</p>
        </div>
        <div className="tag-row">
          <span className="tag">Qualified roles: {qualifiedCount}</span>
          <span className="tag">Tracked contacts: {localContacts.length}</span>
          <span className="tag">Outreach logs: {localOutreach.length}</span>
          <span className="tag">Target companies: {companies.length}</span>
        </div>
      </section>

      <section className="grid two-up">
        <div className="panel">
          <div className="panel-header"><h2>Jobs</h2><p>Seed roles already loaded from your existing board.</p></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Company</th><th>Role</th><th>Location</th><th>Fit</th><th>Status</th></tr></thead>
              <tbody>
                {roles.map(role => (
                  <tr key={role.id}>
                    <td>{role.company}</td>
                    <td>{role.title}</td>
                    <td>{role.location}</td>
                    <td>{score(role)}/100</td>
                    <td>{role.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><h2>Company watchlist</h2><p>Potential hire targets loaded from your imported research batch.</p></div>
          <div className="stack gap-sm">
            {companies.map(company => (
              <div className="watch-card" key={company.id}>
                <div className="watch-top">
                  <strong>{company.name}</strong>
                  <span className="pill">{company.hiringStatus}</span>
                </div>
                <p>{company.currentFocus}</p>
                <p className="muted"><strong>Outreach angle:</strong> {company.personalizationAngle}</p>
                <div className="link-row">
                  <a href={company.website} target="_blank">Website</a>
                  <a href={company.careersUrl} target="_blank">Careers</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid two-up">
        <div className="panel">
          <div className="panel-header">
            <h2>Contacts</h2>
            <div className="filter-row">
              <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}>
                <option value="all">All companies</option>
                {companiesInContacts.map(company => <option key={company} value={company}>{company}</option>)}
              </select>
              <label className="checkbox-row"><input type="checkbox" checked={showEmailOnly} onChange={e => setShowEmailOnly(e.target.checked)} /> Public email only</label>
            </div>
          </div>
          <div className="table-wrap tall">
            <table>
              <thead><tr><th>Company</th><th>Contact</th><th>Title</th><th>Email</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filteredContacts.map(contact => (
                  <tr key={contact.id} className={selectedContact?.id === contact.id ? 'active-row' : ''}>
                    <td>{contact.company}</td>
                    <td>{contact.name}</td>
                    <td>{contact.title}</td>
                    <td>{contact.email || '—'}</td>
                    <td>{contact.status}</td>
                    <td><button className="mini-btn" onClick={() => onSelectContact(contact.id)}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><h2>Personalized message studio</h2><p>Edit, copy, navigate, and mark sent directly from the app.</p></div>
          {!selectedContact || !draftState ? (
            <div className="empty-card">No contact selected.</div>
          ) : (
            <div className="studio">
              <div className="studio-toolbar">
                <select value={selectedContact.id} onChange={e => onSelectContact(e.target.value)}>
                  {filteredContacts.map(contact => <option key={contact.id} value={contact.id}>{contact.company} — {contact.name}</option>)}
                </select>
                <div className="nav-group">
                  <button className="mini-btn" onClick={() => navigate(-1)}>Previous</button>
                  <button className="mini-btn" onClick={() => navigate(1)}>Next</button>
                  <span className="muted small">{filteredContacts.length ? `${studioIndex + 1} / ${filteredContacts.length}` : '0 / 0'}</span>
                </div>
              </div>

              <div className="meta-card">
                <div><strong>{selectedContact.name}</strong></div>
                <div>{selectedContact.title}</div>
                <div className="muted">{selectedContact.company}</div>
                <div className="link-row compact">
                  {selectedContact.linkedin ? <a href={selectedContact.linkedin} target="_blank">LinkedIn</a> : null}
                  {selectedContact.email ? <a href={`mailto:${selectedContact.email}`}>Email</a> : null}
                </div>
              </div>

              <label>Personalization line
                <textarea value={draftState.personalizationLine} onChange={e => setDraftState({ ...draftState, personalizationLine: e.target.value })} />
              </label>
              <label>Email subject
                <input value={draftState.emailSubject} onChange={e => setDraftState({ ...draftState, emailSubject: e.target.value })} />
              </label>
              <label>Cold email
                <textarea className="tall-textarea" value={draftState.emailBody} onChange={e => setDraftState({ ...draftState, emailBody: e.target.value })} />
              </label>
              <label>LinkedIn note
                <textarea value={draftState.linkedinNote} onChange={e => setDraftState({ ...draftState, linkedinNote: e.target.value })} />
              </label>

              <div className="button-row">
                <button className="primary-btn" onClick={saveDraft}>Save draft</button>
                <button className="secondary-btn" onClick={() => copy(`Subject: ${draftState.emailSubject}

${draftState.emailBody}`)}>Copy cold email</button>
                <button className="secondary-btn" onClick={() => copy(draftState.linkedinNote)}>Copy LinkedIn note</button>
              </div>
              <div className="button-row wrap">
                <button className="secondary-btn" disabled={!selectedContact.email} onClick={() => markStatus('email')}>Mark email sent</button>
                <button className="secondary-btn" onClick={() => markStatus('linkedin')}>Mark LinkedIn sent</button>
                <button className="ghost-btn" onClick={() => markStatus('reply')}>Mark replied</button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid two-up">
        <div className="panel">
          <div className="panel-header"><h2>Outreach log</h2><p>Status entries generated from your current portal and manual actions.</p></div>
          <div className="table-wrap tall">
            <table>
              <thead><tr><th>Date</th><th>Company</th><th>Contact</th><th>Channel</th><th>Type</th><th>Status</th></tr></thead>
              <tbody>
                {localOutreach.map(item => (
                  <tr key={item.id}>
                    <td>{item.date}</td>
                    <td>{item.company}</td>
                    <td>{item.contact}</td>
                    <td>{item.channel}</td>
                    <td>{item.type}</td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><h2>24/7 job watcher blueprint</h2><p>Version 1 architecture for always-on role discovery.</p></div>
          <ul className="blueprint-list">
            <li>Supabase stores companies, roles, contacts, outreach logs, and watcher runs.</li>
            <li>A scheduled job watcher runs every 3 hours via GitHub Actions or Vercel Cron.</li>
            <li>Watcher checks target company career pages, RSS feeds, and structured job sources.</li>
            <li>New matches are inserted into the database and surfaced on the dashboard instantly.</li>
            <li>LinkedIn remains a manual workflow. The app stores profile URLs, drafts, and sent-status only.</li>
          </ul>
          <div className="run-cards">
            {runs.slice(0, 4).map(run => (
              <div className="run-card" key={run.id}>
                <strong>{run.runDate}</strong>
                <span>{run.status}</span>
                <p>{run.query}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
