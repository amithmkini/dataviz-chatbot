import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { Function as ToolFunc } from 'ai';


const XAxisSchema = z.object({
  data: z.array(z.string()),
  label: z.string()
})

const YAxisSchema = z.object({
  data: z.array(z.number()),
  label: z.string()
})

const query_database_func: ToolFunc = {
  name: 'query_database',
  description: 'Query the database with a SQL query.',
  parameters: zodToJsonSchema(
      z.object({
      query: z.string().describe("The SQL query to run on the database."),
    }).required()
  )
}

const show_chart_func: ToolFunc = {
  name: 'show_chart',
  description: 'Show a bar or line chart',
  parameters: zodToJsonSchema(
    z.object({
      title: z.string().describe('The title of the chart'),
      type: z.enum(['bar', 'line']).describe('The type of chart to display'),
      x: XAxisSchema.required().describe('The x-axis values'),
      y1: YAxisSchema.required().describe('The y-axis values (left)'),
      y2: YAxisSchema.optional().describe('The y-axis values (right)')
    })
      .describe('The x-axis and y-axis values, with the title and type')
  )
}

export { query_database_func, show_chart_func }