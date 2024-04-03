'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useActions, useAIState } from 'ai/rsc'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IconSpinner } from '@/components/ui/icons'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

import { type AI } from '@/lib/chat/actions'
import { cn } from '@/lib/utils'
import { useEnterSubmit } from '@/lib/hooks/use-enter-submit'


export default function DatabaseInput() {

  const router = useRouter()
  const [aiState] = useAIState()
  const [databaseUrl, setDatabaseUrl] = React.useState(aiState.databaseUrl ?? '')
  const [databaseAuthToken, setDatabaseAuthToken] = React.useState(aiState.databaseAuthToken ?? '')
  const [submitDisabled, setsubmitDisabled] = React.useState(false)
  const { formRef, onKeyDown } = useEnterSubmit()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [openAccordion, setOpenAccordion] = React.useState(
    aiState.databaseUrl === ''
  )
  const [triggerString, setTriggerString] = React.useState(
    aiState.databaseUrl === '' ? 'Connect to Database' : `Connected: ${aiState.databaseUrl}`
  )

  const { setDatabaseCreds } = useActions();

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  return (
    <div className="mx-auto max-w-2xl px-4 mb-4">
      <div className="">
        <Accordion type="single" collapsible className="rounded-lg bg-background p-8" value={openAccordion ? 'item-1' : undefined}>
          <AccordionItem value="item-1">
            <AccordionTrigger className={!openAccordion ? 'text-gray-500' : ''}>{triggerString}</AccordionTrigger>
            <AccordionContent>
              <form 
                ref={formRef}
                onSubmit={async (e: any) => {
                  e.preventDefault()
                  console.log('Database URL:', databaseUrl)
                  console.log('Database Auth Token:', databaseAuthToken)
                  setsubmitDisabled(true)
                  const response = await setDatabaseCreds(databaseUrl, databaseAuthToken);
                  if (response.success) {
                    toast.success('Credentials set successfully')
                    setOpenAccordion(false)
                    setTriggerString(`Connected: ${databaseUrl}`)
                  } else {
                    toast.error(response.error)
                  }
                  setsubmitDisabled(false)
                }}
              >
                <div className="flex flex-col gap-2 p-1">
                  <Input
                    ref={inputRef}
                    id="databaseUrl"
                    type="text"
                    value={databaseUrl}
                    onKeyDown={onKeyDown}
                    placeholder='Database URL'
                    onChange={(e) => setDatabaseUrl(e.target.value)}
                    className="peer block w-full rounded-md border bg-zinc-50 px-2 py-[9px] text-sm outline-none placeholder:text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950"
                  />
                  <Input
                    id="databaseAuthToken"
                    type="password"
                    value={databaseAuthToken}
                    onKeyDown={onKeyDown}
                    placeholder='Database Auth Token'
                    onChange={(e) => setDatabaseAuthToken(e.target.value)}
                    className="peer block w-full rounded-md border bg-zinc-50 px-2 py-[9px] text-sm outline-none placeholder:text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950"
                  />
                  <div className='object-cover'>
                    <Button type="submit" disabled={submitDisabled}>
                      <span className={cn(submitDisabled ? 'hidden': 'block')}>Submit</span>
                      <span className={cn(submitDisabled ? 'block': 'hidden')}>
                        <IconSpinner className="animate-spin" />
                      </span>
                    </Button>
                  </div>
                </div>
              </form>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  )
}