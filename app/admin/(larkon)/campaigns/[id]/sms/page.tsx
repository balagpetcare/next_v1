import { redirect } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export default async function AdminCampaignSmsRedirect({ params }: Props) {
  const { id } = await params
  redirect(`/admin/campaigns/${id}/operations-center?tab=sms`)
}
