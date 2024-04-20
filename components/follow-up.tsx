'use client'
import { useState } from 'react'
import { useUIState, useActions } from "ai/rsc"
import { nanoid } from "nanoid"

import { Button } from "@/components/ui/button"
import { UserMessage } from "@/components/graphs/message"
import { IconSpinner } from '@/components/ui/icons'
import type { AI } from '@/lib/chat/actions'
import { cn } from '@/lib/utils'


function FollowupQuestionButton({question} : {question: string}) {
  const [messages, setMessages] = useUIState<typeof AI>()
  const { submitUserMessage } = useActions()

  return (
    <div
      className={'cursor-pointer rounded-lg border bg-white p-4 hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900'}
      onClick={async () => {
        setMessages(currentMessages => [
        ...currentMessages,
        {
          id: nanoid(),
          databaseUrl: '',
          databaseAuthToken: '',
          display: <UserMessage>{question}</UserMessage>
        }
        ])

        const responseMessage = await submitUserMessage(question)

        setMessages(currentMessages => [
          ...currentMessages,
          responseMessage
        ])
      }}
    >
      <div className="text-sm text-zinc-600">
        {question}
      </div>
    </div>
  )
}

export function FollowupPanel() {

  const [questions, setQuestions] = useState<string[]>([])
  const [disabled, setDisabled] = useState<boolean>(false)
  const { getFollowUpQuestions } = useActions()

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setDisabled(true)
    const response = await getFollowUpQuestions()
    setQuestions(response)
    setDisabled(false)
  }

  return (
    <div className="border rounded-md p-4 gap-2 flex flex-col items-start">
      <Button
        variant='secondary'
        onClick={handleSubmit}
        className={cn("max-w-max", questions.length > 0 ? 'hidden' : 'block')}
        disabled={disabled}
      >
        <span className={cn(disabled ? 'hidden': 'block')}>Generate follow-up queries</span>
        <span className={cn(disabled ? 'flex flex-row': 'hidden')}>
          <IconSpinner className="animate-spin mt-0.5" />
          Retrieving...
        </span>
      </Button>
      {questions.map((question, index) => (
        <FollowupQuestionButton key={index} question={question} />
      ))}
    </div>
  )
}
