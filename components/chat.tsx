'use client'

import { cn } from '@/lib/utils'
import { ChatList } from '@/components/chat-list'
import { ChatPanel } from '@/components/chat-panel'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import type { AI } from '@/lib/chat/actions'
import { useEffect, useState } from 'react'
import { useUIState, useAIState } from 'ai/rsc'
import { Session } from '@/lib/types'
import { usePathname, useRouter } from 'next/navigation'
import { Message } from 'ai'
import { useScrollAnchor } from '@/lib/hooks/use-scroll-anchor'
import { toast } from 'sonner'
import DatabaseInput from './database-input'
import { FollowupPanel } from './follow-up'

export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[]
  id?: string
  session?: Session
  missingKeys: string[]
}

export function Chat({ id, className, session, missingKeys }: ChatProps) {
  const router = useRouter()
  const path = usePathname()
  const [input, setInput] = useState('')
  const [messages] = useUIState<typeof AI>()
  const [aiState] = useAIState<typeof AI>()

  const [_, setNewChatId] = useLocalStorage('newChatId', id)

  const [followupVisible, setFollowupVisible] = useState(false)

  useEffect(() => {
    if (session?.user) {
      if (!path.includes('chat') && messages.length === 2) {
        window.history.replaceState({}, '', `/chat/${id}`)
      }
    }
  }, [id, path, session?.user, messages])

  useEffect(() => {
    const messagesLength = aiState.messages?.length
    if (
      messagesLength >= 4 && messagesLength <= 8 &&
      path.includes('chat') && !path.includes('share') &&
      aiState.messages[messagesLength - 1].role === 'assistant'
    ) {
      // Delay the refresh to not make it jarring
      setTimeout(() => {
        router.refresh()
      }, 2000)
    }
  }, [aiState.messages, router, path])

  useEffect(() => {
    if (
        messages.length > 0 &&
        messages[messages.length - 1].lastMessage &&
        aiState.messages.length > 0 &&
        aiState.messages[aiState.messages.length - 1].role === 'assistant') {
      setFollowupVisible(true)
    }
    else {
      setFollowupVisible(false)
    }
  }, [aiState, messages])

  useEffect(() => {
    setNewChatId(id)
  }, [id, setNewChatId])

  useEffect(() => {
    missingKeys.map(key => {
      toast.error(`Missing ${key} environment variable!`)
    })
  }, [missingKeys])

  const { messagesRef, scrollRef, visibilityRef, isAtBottom, scrollToBottom } =
    useScrollAnchor()

  return (
    <div
      className="group w-full overflow-auto pl-0 peer-[[data-state=open]]:lg:pl-[250px] peer-[[data-state=open]]:xl:pl-[300px] duration-300 ease-in-out animate-in-out"
      ref={scrollRef}
    >
      <div
        className={cn('pb-[200px] pt-4 md:pt-10', className)}
        ref={messagesRef}
      >
        <DatabaseInput />
        {messages.length !== 0 && (
          <ChatList messages={messages} isShared={false} session={session} />
        )}
        <div className="h-px w-full" ref={visibilityRef} />
        <div className='relative mx-auto max-w-2xl px-4'>
          {followupVisible && <FollowupPanel key={messages[messages.length - 1].id}/>}
        </div>
      </div>
      <ChatPanel
        id={id}
        input={input}
        setInput={setInput}
        isAtBottom={isAtBottom}
        scrollToBottom={scrollToBottom}
      />
    </div>
  )
}
