'use client'

import { JSONValue } from 'ai'
import * as React from 'react'
import { TableIcon } from '@radix-ui/react-icons'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from '@/components/ui/separator'
import { useCopyToClipboard } from '@/lib/hooks/use-copy-to-clipboard'

import { SystemMessage } from './message'
import { SqlTable } from './sql-output-table'


interface SqlOutputProps {
  sql: string
  output?: string
  separator?: boolean
}

export function SqlOutputDialog(
  { sql, output, separator }: SqlOutputProps) {
  // The SQL string is encased inside <SystemMessage>
  // But if the output is mentioned, we add a button
  // that opens a dialog with the SQL output

  // Questioning my life choices as I include unnecessary things
  const { copyToClipboard } = useCopyToClipboard({ timeout: 1000 })
  
  const copySql = React.useCallback(
    async (sql : string) => {
      copyToClipboard(sql + ';')
      toast.success('Copied to clipboard', { duration: 1000 })
    },
    [copyToClipboard]
  )

  let sqlOutput;

  if (output) {
    sqlOutput = JSON.parse(output)
  }

  return (
    <>
      <SystemMessage>
        <div className='flex flex-row items-center gap-1'>
          <span 
            onClick={() => copySql(sql)}
            className='text-center'>
              SQL Query: {sql}
          </span>
          {output !== '' && <SqlOutputTable sql={sql} output={sqlOutput}/>}
        </div>
      </SystemMessage>
      {separator && <Separator className='my-4' />}
    </>
  )
}

function TableIconWithTooltip() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* I'm ashamed that I worked too 
            * hard on that 2px adjustment 
            */}
          <TableIcon className='-mt-0.5'/>
        </TooltipTrigger>
        <TooltipContent>
          <p>Show SQL Output</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function SqlOutputTable({
  sql,
  output
} : { sql: string, output: JSONValue }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size='icon'>
          <TableIconWithTooltip />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>SQL Output</DialogTitle>
          <DialogDescription>
            {sql}
          </DialogDescription>
        </DialogHeader>
        <SqlTable output={output} />
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
