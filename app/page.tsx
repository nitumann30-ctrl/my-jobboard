import DashboardPage from '@/components/DashboardPage'
import { getInitialData } from '@/lib/data-source'

export default async function Page() {
  const data = await getInitialData()

  return (
    <DashboardPage
      roles={data.roles as any}
      contacts={data.contacts as any}
      outreach={data.outreach as any}
      drafts={data.drafts as any}
      companies={data.companies as any}
      runs={data.runs as any}
      dataMode={data.mode}
    />
  )
}
