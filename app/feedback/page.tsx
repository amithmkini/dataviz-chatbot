import { redirect } from 'next/navigation'

import { auth } from '@/auth'
import { Feedback } from '@/components/feedback'
import { Session } from '@/lib/types'


export const runtime = 'edge'
export const preferredRegion = 'home'

export const metadata = {
  title: 'User Feedback'
}

export default async function FeedbackPage() {
  const session = (await auth()) as Session

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <Feedback />
  )
}
