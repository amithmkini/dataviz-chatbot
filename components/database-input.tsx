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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


import { cn } from '@/lib/utils'
import { useEnterSubmit } from '@/lib/hooks/use-enter-submit'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'


export default function DatabaseInput() {

  const router = useRouter()
  const [aiState] = useAIState()
  const [databaseUrl, setDatabaseUrl] = useLocalStorage('databaseUrl', aiState.databaseUrl)
  const [databaseAuthToken, setDatabaseAuthToken] = useLocalStorage('databaseAuthToken', aiState.databaseAuthToken)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
  }


  return (
    <div className="mx-auto max-w-2xl px-4 mb-4">
      <div className="">
        <Accordion type="single" collapsible className="rounded-lg bg-background p-8" value={openAccordion ? 'item-1' : undefined}>
          <AccordionItem value="item-1">
            <AccordionTrigger className={!openAccordion ? 'text-gray-500' : ''}>{triggerString}</AccordionTrigger>
            <AccordionContent>
              <form 
                ref={formRef}
                onSubmit={handleSubmit}
              >
                <div className='flex flex-col sm:flex-row'>
                  <div className="flex flex-col basis-2/3 gap-2 p-1 border-b sm:border-b-0 border-r-0 sm:border-r">
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
                  <div className='flex flex-col basis-1/3 gap-2 p-1 items-start sm:items-center justify-start'>
                    <Label className='h-9 flex items-center'>Or pick a sample dataset</Label>
                    <SelectDemoDB 
                      setUrl={setDatabaseUrl}
                      setAuthToken={setDatabaseAuthToken}
                    />
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

interface SelectDemoDBProps {
  setUrl: (url: string) => void
  setAuthToken: (authToken: string) => void
}

interface SelectItem {
  name: string
  url: string
  authtoken: string
}


function SelectDemoDB(
  {setUrl, setAuthToken}: SelectDemoDBProps ) {

  const [selected, setSelected] = React.useState('')
  const handleSelect = (value: string) => {
    setSelected(value)
    // Get the selected item from the entry
    const item = values.find((item) => item.name === value)
    if (item) {
      setUrl(item.url)
      setAuthToken(item.authtoken)
    }
  }

  const [values, setValues] = React.useState<SelectItem[]>([])

  React.useEffect(() => {
    fetch('/api')
      .then((res) => res.json())
      .then((data) => {
        setValues(data)
      })
  }, [])

  return (
    <Select onValueChange={handleSelect} value={selected}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a database" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {values.map((item) => (
            <SelectItem key={item.name} value={item.name}>
              {item.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
