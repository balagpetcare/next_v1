import { redirect } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export default async function AdminCampaignStatisticsRedirect({ params }: Props) {
  const { id } = await params
  redirect(`/admin/campaigns/${id}/reports`)
}
