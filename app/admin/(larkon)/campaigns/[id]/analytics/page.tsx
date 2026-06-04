import { redirect } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export default async function AdminCampaignAnalyticsRedirect({ params }: Props) {
  const { id } = await params
  redirect(`/admin/campaigns/${id}/operations-center?tab=analytics`)
}
