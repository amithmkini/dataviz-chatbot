import { JSONValue } from "ai"

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
 
export function SqlTable({
  output
}: {output: JSONValue}) {

  if (!output || !Array.isArray(output) || output.length === 0) {
    return (
      <>
        No SQL Output to display.
      </>
    )
  }

  const out = output as Array<Record<string, any>>
  const captions = (
    out.length === 200 ? 'Output truncated to 200 rows' : 'Output'
  )
  // Get the table header from the first row
  const headers = Object.keys(out.length > 0 ? out[0]: [])
  const hidden = Array.isArray(out[0])

  return (
    <ScrollArea className="max-h-48 sm:max-h-96">
      <Table>
        <TableCaption>{captions}</TableCaption>
        <TableHeader className={hidden ? 'hidden': ''}>
          <TableRow>
            {headers.map((header) => (
              <TableCell key={header}>
                {header}
              </TableCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {out.map((row, index) => (
            <TableRow key={index}>
              {headers.map((header) => {
                const value = (isNaN(row[header]) ? row[header] : Number(row[header]).toFixed(4))
                return <TableCell key={header}>{value}</TableCell>
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  )
}