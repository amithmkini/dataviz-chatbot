import * as React from 'react'

import { PromptForm } from '@/components/prompt-form'
import { ButtonScrollToBottom } from '@/components/button-scroll-to-bottom'
import { RocketIcon } from '@radix-ui/react-icons' 
import { useAIState, useActions, useUIState } from 'ai/rsc'
import type { AI } from '@/lib/chat/actions'
import { nanoid } from 'nanoid'
import { UserMessage } from './graphs/message'
import { FollowupPanel } from './follow-up'

export interface ChatPanelProps {
  id?: string
  title?: string
  input: string
  setInput: (value: string) => void
  isAtBottom: boolean
  scrollToBottom: () => void
}

export function ChatPanel({
  id,
  title,
  input,
  setInput,
  isAtBottom,
  scrollToBottom
}: ChatPanelProps) {
  const [aiState] = useAIState()
  const [messages, setMessages] = useUIState<typeof AI>()
  const { submitUserMessage, getExampleMessagesFromSchema } = useActions()
  const [graphSelection, setGraphSelection] = React.useState(false)
  const [exampleMessages, setExampleMessages] = React.useState<any[]>([])

  React.useEffect(() => {
    // If the last message has the ID that ends with 'graph',
    // then set the graphSelection to true
    if (aiState.messages[aiState.messages.length - 1]?.id?.endsWith('graph')) {
      setGraphSelection(true)
    } else {
      setGraphSelection(false)
    }

    const fetch_status = async (schema: string) => {
      const status = await getExampleMessagesFromSchema(schema)
      if (status.success) {
        setExampleMessages(status.exampleMessages)
      }
    }

    if (aiState.messages.length === 1 && exampleMessages.length === 0) {
      fetch_status(aiState.messages[0].content)
    }
  }, [aiState.messages, setExampleMessages, getExampleMessagesFromSchema, exampleMessages.length])

  return (
    <div className="fixed inset-x-0 bottom-0 w-full bg-gradient-to-b from-muted/30 from-0% to-muted/30 to-50% duration-300 ease-in-out animate-in dark:from-background/10 dark:from-10% dark:to-background/80 peer-[[data-state=open]]:group-[]:lg:pl-[250px] peer-[[data-state=open]]:group-[]:xl:pl-[300px]">
      <ButtonScrollToBottom
        isAtBottom={isAtBottom}
        scrollToBottom={scrollToBottom}
      />

      <div className="mx-auto sm:max-w-2xl sm:px-4">
        <div className="mb-4 grid grid-cols-2 gap-2 px-4 sm:px-0">
          {(messages.length === 0 && exampleMessages.length !== 0) &&
            exampleMessages.map((example, index) => (
              <div
                key={index}
                className={`cursor-pointer rounded-lg border bg-white p-4 hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900 ${
                  index > 1 && 'hidden md:block'
                }`}
                onClick={async () => {
                  setMessages(currentMessages => [
                    ...currentMessages,
                    {
                      id: nanoid(),
                      display: <UserMessage>{example.message}</UserMessage>,
                      lastMessage: false
                    }
                  ])

                  const responseMessage = await submitUserMessage(
                    example.message
                  )

                  setMessages(currentMessages => [
                    ...currentMessages,
                    responseMessage
                  ])
                }}
              >
                <div className="text-sm font-semibold">{example.heading}</div>
                <div className="text-sm text-zinc-600">
                  {example.subheading}
                </div>
              </div>
            ))}
        </div>
        <div className="space-y-4 border-t bg-background px-4 py-2 shadow-lg sm:rounded-t-xl sm:border md:py-4">
          {graphSelection ? (
            <div className="flex items-center justify-between">
              <div className="flex flex-row gap-2 text-sm text-zinc-500">
                <RocketIcon className='mt-0.5'/> Ask about this graph segment
              </div>
            </div>
            ) : (null)}
          <PromptForm input={input} setInput={setInput} />
        </div>
      </div>
    </div>
  )
}
