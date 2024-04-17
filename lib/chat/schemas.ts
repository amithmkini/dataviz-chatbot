import dedent from 'dedent'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { Function as ToolFunc } from 'ai'


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

const bar_line_chart_func: ToolFunc = {
  name: 'show_bar_line_chart',
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

const pie_chart_func: ToolFunc = {
  name: 'show_pie_chart',
  description: 'Show a pie or doughnut chart',
  parameters: zodToJsonSchema(
    z.object({
      title: z.string().describe('The title of the chart'),
      type: z.enum(['pie', 'doughnut']).describe('The type of chart to display'),
      labels: z.array(z.string()).describe('The labels for each section of the chart'),
      dataset: z.array(z.number()).describe('The data for each section of the chart'),
      tooltip: z.string().optional().default('Value')
        .describe('The tooltip to display when hovering over the chart')
    })
      .required()
  )
}

const correlation_func: ToolFunc = {
  name: 'correlation',
  description: dedent`
    Calculate the correlation between sets of data from a SQL query.
    The SQL query should return a table with two or more columns of numeric data.
  `,
  parameters: zodToJsonSchema(
    z.object({
      query: z.string().describe('The SQL query to run on the database'),
    }).required()
  )
}

export { query_database_func, bar_line_chart_func, pie_chart_func, correlation_func }
