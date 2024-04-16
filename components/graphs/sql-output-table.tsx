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

const invoices = [
  {
    invoice: "INV001",
    paymentStatus: "Paid",
    totalAmount: "$250.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV002",
    paymentStatus: "Pending",
    totalAmount: "$150.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV003",
    paymentStatus: "Unpaid",
    totalAmount: "$350.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV004",
    paymentStatus: "Paid",
    totalAmount: "$450.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV005",
    paymentStatus: "Paid",
    totalAmount: "$550.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV006",
    paymentStatus: "Pending",
    totalAmount: "$200.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV007",
    paymentStatus: "Unpaid",
    totalAmount: "$300.00",
    paymentMethod: "Credit Card",
  },
]
 
export function SqlTable({
  output
}: {output: JSONValue}) {

  if (!output) {
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