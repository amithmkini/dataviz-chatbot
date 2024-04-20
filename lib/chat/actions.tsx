import 'server-only'

import {
  experimental_generateText,
  JSONValue,
  OpenAIStream,
  Tool,
  ToolCall,
  ToolCallPayload,
  Message
} from 'ai'
import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  createStreamableValue
} from 'ai/rsc'
import { openai as oai } from '@ai-sdk/openai'
import dedent from 'dedent'
import { createClient, LibsqlError, ResultSet } from '@libsql/client/web'
import OpenAI from 'openai'
import { ChatCompletionMessageParam } from 'openai/resources'
import { kv } from '@vercel/kv'
import { z } from 'zod'

import { saveChat } from '@/app/actions'
import { auth } from '@/auth'
import { LineBarGraph, SqlOutputDialog, PieChart } from '@/components/graphs'
import {
  BotCard,
  BotMessage,
  SystemMessage,
  UserMessage
} from '@/components/graphs/message'
import { spinner } from '@/components/graphs/spinner'
import { Separator } from '@/components/ui/separator'
import { 
  Chat,
  LineBarGraphProps,
  AIState,
  UIState,
  ToolCallResponse,
  PieDoughnutProps
} from '@/lib/types'
import {
  runAsyncFnWithoutBlocking,
  nanoid
} from '@/lib/utils'

import {
  query_database_func,
  bar_line_chart_func,
  pie_chart_func,
  correlation_func
} from './schemas'
import { system_prompt } from './prompt'
import { calculateCorrelationMatrix } from './statistics'
import React from "react";

export const runtime = 'edge'
export const preferredRegion = 'home'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
})

const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
const temperature: number =  +(process.env.OPENAI_MODEL_TEMPERATURE || 0.5)

let warning = ''
async function correlation(query: string, aiState: any, ui: any) {
  // Given a dataset, we need to calculate the correlation matrix.
  // We need to get all the SQL from the rows list.
  try {
    const client = createClient({
      url: aiState.get().databaseUrl,
      authToken: aiState.get().databaseAuthToken
    });
  
    const data = await client.execute(query)
    client.close()

    const columns: (number)[][] = data.columns.map(() => [])

    data.rows.forEach(row => {
      // If there are any null values, skip the row.
      if (Object.values(row).some(value => value === null)) {
        warning = 'NULL values found in rows. Skipping them'
        return
      }
      data.columns.forEach((col, index) => {
        const value = row[col]
        columns[index].push(value === null ? 0 : Number(value))
      })
    })
    // First convert the matrix to string/number format.
    const matrix = calculateCorrelationMatrix(columns) as (string | number)[][]
    // Add the column names to the matrix at the first row and first column.
    matrix.unshift(data.columns)
    matrix.forEach((row, index) => row.unshift(data.columns[index]))
    matrix[0][0] = ''

    ui.update(
      <SqlOutputDialog sql={query} output={JSON.stringify(matrix)} separator/>
    )
    return {
      success: true,
      output: matrix,
      warning: warning
    }
  } catch (e) {
    if (e instanceof LibsqlError) {
      return {
        success: false,
        output: e.message,
        warning: warning
      }
    }
  }

  return {
    success: false,
    output: 'Error in finding correlation',
    warning: warning
  }
}

async function filter_schema(output: ResultSet) {
  // We need to get all the SQL from the rows list.Since we are simply reading 
  // from the table, we need not know the defaults and constraints.
  // So we use an OpenAI call to filter out the unnecessary information.
  const schemaString = output.rows.map(row => row.sql).join('\n');

  // Calculate the hash of this string, and check the cache before
  // calling OpenAI.
  const hashHex = await crypto.subtle.digest(
    'SHA-256', new TextEncoder().encode(schemaString))
    .then(hash => Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(''));
  
  const cacheKey = `schema:${hashHex}`;

  const cached = await kv.hget(cacheKey, 'filtered');
  if (cached) {
    return cached;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    temperature,
    messages: [
      {
        role: "system",
        content: dedent`You are given a SQL schema from a SQLite database. 
                        Your task is to remove unnecessary information from 
                        the schema in the context of reading, such as
                        DEFAULT, AUTOINCREMENT, NOT NULL, etc.
                        ONLY REPLY WITH THE FILTERED SCHEMA.`
      },
      {
        role: "system",
        content: schemaString
      }
    ]
  });

  const filtered = completion.choices[0].message.content;
  await kv.hset(cacheKey, { filtered });
  return filtered;
}

async function setDatabaseCreds(url: string, authToken: string) {
  'use server'
  const aiState = getMutableAIState<typeof AI>()

  // If the aiState already has databaseUrl and databaseAuthToken,
  // don't do anything. We are not going to update the URL as well,
  // since that would ruin the conversation with extra schemas.
  if (aiState.get().databaseUrl && 
      aiState.get().databaseAuthToken) {
    return {
      success: false,
      error: "Database URL and auth token already set."
    }
  }

  // Use Turso to connect to the DB using the URL, and see if the 
  // connection is successful. If it is, save the URL to the state.
  try {
    const client = createClient({
      url,
      authToken,
    });
    // Get the schema of the database, note that this is a SQLite
    //  specific query, and may not work with other databases.
    const output = await client.execute(
      "SELECT sql FROM sqlite_master WHERE type='table';"
    );
    client.close()
    const schema = await filter_schema(output);
    // Now add the schema to the state.
    const schemaMessage = `[Database schema]\n${schema}`;
    

    aiState.done({
      ...aiState.get(),
      databaseUrl: url,
      databaseAuthToken: authToken,
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'system',
          content: schemaMessage
        }
      ]
    });
  } catch (e) {
    if (e instanceof LibsqlError) {
      return {
        success: false,
        error: e.message
      }
    }
  }
  return {
    success: true
  }
}

async function getExampleMessagesFromSchema(schema: string) {
  'use server'

  let exampleMessages: any[] = []

  if (!schema) {
    return {
      success: false,
      exampleMessages,
    }
  }

  const result = await experimental_generateText({
    model: oai.chat(model),
    temperature,
    // maxTokens: 512,
    tools: {
      example_queries: {
        description: 'An example user query based on the schema',
        parameters: z.object({
          heading: z.string().describe('Summarize the message'),
          subheading: z.string().describe('Show first few words of the message'),
          message: z.string().describe('The user query/message that is sent to the AI')
        }),
      },
    },
    prompt: dedent`
      Given a SQL schema, provide example natural language queries that users
      can use to query and visualize their data. Read the schema, silently
      understand what the dataset is about, guess the domain, and generate
      natural language queries that user can use to send it to the LLM.

      The LLM generates DB queries based on the user query and draws graphs
      and charts (think line chart, bar charts, pie charts). For example, if
      the dataset is on sales figures, the questions will be like:

      - Show me a bar chart of top 10 bar charts.
      - What is the total revenue generated from selling the best seller.
      - Show me a pie chart of all goods sold by quantity in the month of May.

      If the schema is about sales and product, you have no clue about the
      type and names of the product, so avoid using a specific entity name.
      On the other hand, if the possibilities is something limited, say
      phone manufacturers in the United States, you know of the popular ones
      that will be there for sure.

      Generate at least 2 queries, and at most 4 queries. And call the tool
      in parallel, all at once. There will be no response from the results.

      ${schema}
    `
  });

  for (const toolCall of result.toolCalls) {
    switch (toolCall.toolName) {
      case 'example_queries': {
        exampleMessages.push({
          heading: toolCall.args.heading,
          subheading: toolCall.args.subheading,
          message: toolCall.args.message
        })
        break;
      }
    }
  }

  return {
    success: true,
    exampleMessages: exampleMessages,
  }
}

async function query_database(query: string, aiState: any) {
  'use server'

  try {
    const client = createClient({
      url: aiState.get().databaseUrl,
      authToken: aiState.get().databaseAuthToken
    });

    const output = await client.execute(query)
    // If the number of rows is more than 200, then we need to
    // trucate the output to 200 rows, and show a warning
    const sliced = output.rows.slice(0, 200) as Array<JSONValue>
    const warning = ( output.rows.length > 200 ?
      `Warning: The number of rows is more than 200. 
       Only the first 200 rows are shown.` : '' )

    client.close()
    return {
      success: true,
      output: sliced,
      warning: warning
    }

  } catch (e) {
    if (e instanceof LibsqlError) {
      return {
        success: false,
        output: e.message,
        warning: ''
      }
    }
  }
  return {
    success: false,
    output: "Unknown error",
    warning: ''
  }
}

async function getFollowUpQuestions() {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  // Get only the last message from the user, and then the last message
  // with content from the assistant.

  const schema = aiState.get().messages[0].content as string
  const lastUserMessage = aiState.get().messages.filter(
    message => message.role === 'user'
  ).pop()
  const lastAsstMessage = aiState.get().messages.filter(
    message => message.role === 'assistant' && message.content
  ).pop()

  if (!lastUserMessage || !lastAsstMessage) {
    return []
  }

  let followupMessages: any[] = []

  const result = await experimental_generateText({
    model: oai.chat(model),
    temperature,
    maxTokens: 100,
    tools: {
      followup_message: {
        description: dedent`A followup query that the user can ask
                            based on the last user message`,
        parameters: z.object({
          message: z.string().describe('The user query that is sent to the AI')
        }).required(),
      },
    },
    prompt: dedent`
      Given a SQL schema, the user message and the AI response, provide a
      follow-up question that the user (not AI) can ask based on the last 
      AI response.

      For example, if the user message is "Show me the top 10 sales figures",
      and the AI response is a bar chart of the top 10 sales figures, the
      follow-up question can be "What is the total revenue generated from the
      top 10 sales figures?"

      Generate at least 2 queries, and at most 4 queries. And call the tool
      in parallel, all at once. There will be no response from the results.

      ${schema}

      [User message]
      ${lastUserMessage.content}

      [Assistant response]
      ${lastAsstMessage.content}
    `
  });

  for (const toolCall of result.toolCalls) {
    switch (toolCall.toolName) {
      case 'followup_message': {
        followupMessages.push(toolCall.args.message)
        break;
      }
    }
  }

  return followupMessages
}

const tools: Tool[] = [
  {
    type: 'function',
    function: query_database_func,
  },
  {
    type: 'function',
    function: bar_line_chart_func,
  },
  {
    type: 'function',
    function: pie_chart_func
  },
  {
    type: 'function',
    function: correlation_func,
  }
]

async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  const response = await openai.chat.completions.create({
    model,
    temperature,
    stream: true,
    messages: [
      system_prompt,
      ...aiState.get().messages.map((message: Message) => ({
        role: message.role,
        content: message.content,
        name: message.name,
        tool_call_id: message.tool_call_id,
        tool_calls: message.tool_calls
      })) 
    ] as ChatCompletionMessageParam[],
    tools,
    tool_choice: 'auto',
  })

  const responseUI = createStreamableUI(<></>)
  const spinnerUI = createStreamableUI(spinner)
  const spinnerWithResponseUI = createStreamableUI(
    <>
      {responseUI.value}
      {spinnerUI.value}
    </>
  )

  runAsyncFnWithoutBlocking(async () => {
    let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
    let textNode: undefined | React.ReactNode
    let textValue: string = ''

    const stream = OpenAIStream(response, {
      experimental_onToolCall: async (
        call: ToolCallPayload,
        appendToolCallMessage,
      ) => {

        let newMessages: ToolCallResponse[] = []

        const tool_call_message = {
          role: 'assistant',
          content: '',
          tool_calls: call.tools.map((toolCall) => ({
            id: toolCall.id,
            type: toolCall.type,
            function: {
              name: toolCall.func.name,
              arguments: JSON.stringify(toolCall.func.arguments)
            }
          }))
        }

        for (const toolCall of call.tools) {
          let output: JSONValue = null;

          if (toolCall.func.name === 'query_database') {
            const query = toolCall.func.arguments.query as string
            const sqlQueryUI = createStreamableUI(<SqlOutputDialog sql={query} separator/>)
            responseUI.append(sqlQueryUI.value)
            
            output = await query_database(query, aiState)
            sqlQueryUI.done(
              <SqlOutputDialog sql={query} output={JSON.stringify(output.output)} separator/>
            )
          } else if(toolCall.func.name === 'show_bar_line_chart') {
            const props = 
              toolCall.func.arguments as unknown as LineBarGraphProps
            responseUI.append(
              <>
                <BotCard>
                  <LineBarGraph props={props} />
                </BotCard>
                <Separator className='my-4' />
              </>
            )

            output = {
              success: true,
            }
          } else if(toolCall.func.name === 'show_pie_chart') {
            const props =
              toolCall.func.arguments as unknown as PieDoughnutProps
            responseUI.append(
              <>
                <BotCard>
                  <PieChart props={props} />
                </BotCard>
                <Separator className='my-4' />
              </>
            )

            output = {
              success: true,
            }
          } else if(toolCall.func.name === 'correlation') {
            const query = toolCall.func.arguments.query as string
            const sqlQueryUI = createStreamableUI(<SqlOutputDialog sql={query} separator/>)
            responseUI.append(sqlQueryUI.value)

            output = await correlation(query, aiState, sqlQueryUI)
            sqlQueryUI.done()
          }

          newMessages.push({
            tool_call_id: toolCall.id,
            function_name: toolCall.func.name,
            function_args: toolCall.func.arguments as JSONValue,
            tool_call_result: output
          })
        }

        // Update aiState
        aiState.update({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            tool_call_message,
            ...newMessages.map((message) => ({
              id: nanoid(),
              role: 'tool',
              name: message.function_name,
              data: message.function_args,
              content: JSON.stringify(message.tool_call_result),
              tool_call_id: message.tool_call_id,
            }))
          ] as Message[]
        })

        return openai.chat.completions.create({
          model,
          temperature,
          stream: true,
          messages: [
            system_prompt,
            ...aiState.get().messages.map((message: Message) => ({
              role: message.role,
              content: message.content,
              name: message.name,
              tool_call_id: message.tool_call_id,
              tool_calls: message.tool_calls
            })) 
          ] as ChatCompletionMessageParam[],
          tools,
          tool_choice: 'auto',
        })
      },
      onCompletion(completion) {
        if (textStream && textNode) {
          // IMP: Call done so that you don't get harrassed by the logs
          textStream.done()

          // Unset so that we can reuse the variables in the 
          // next iteration.
          textStream = undefined
          textNode = undefined

          // Append the text to aiState as assistant message.
          aiState.update({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: textValue
              }
            ]
          })
          textValue = ''
        }
      },
      onText(text) {
        // This is plain text. We need to append it to the responseUI.
        if (!textStream) {
          textStream = createStreamableValue('')
          textNode = <BotMessage content={textStream.value} />
          responseUI.append(textNode)
        }
        textStream.update(text)

        // This is for updating the aiState
        textValue += text
      },
    })

    // Start the stream
    const reader = stream.getReader()
    while (true) {
      const { done } = await reader.read()
      if (done) {
        responseUI.done()
        spinnerUI.done(<></>)
        spinnerWithResponseUI.done()
        aiState.done({
          ...aiState.get(),
        })
        break
      }
    }
  })

  return {
    id: nanoid(),
    display: spinnerWithResponseUI.value,
    lastMessage: true
  }
}


export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    setDatabaseCreds,
    getExampleMessagesFromSchema,
    getFollowUpQuestions
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), databaseUrl: '', databaseAuthToken: '', messages: [] },
  unstable_onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState()
      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  unstable_onSetAIState: async ({ state, done }) => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const { chatId, messages, databaseUrl, databaseAuthToken } = state

      // If there are no messages, then don't save the chat.
      if (messages.length === 0) {
        return
      }

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`

      // Get the title from the 2nd message, and truncate it to 100 characters.
      // If there's no 2nd message, then use the first message.
      const title = (
        messages[1]?.content.substring(0, 100) ||
        messages[0].content.substring(0, 100)
      )

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path,
        databaseUrl,
        databaseAuthToken
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => (message.role !== 'system'))
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display: getDisplayComponent(message),
      lastMessage: true
    }))
}

const getDisplayComponent = (message: Message) => {
  switch (message.role) {
    case 'user':
      return <UserMessage>{message.content}</UserMessage>
    case 'assistant':
      // If the message has tool_calls, then show the tool and the parameter:
      if (message.tool_calls) {
        const toolCalls = typeof message.tool_calls === 'string' ? JSON.parse(message.tool_calls) : message.tool_calls
        return toolCalls.map((toolCall: ToolCall) => {
          if (toolCall.function.name == 'show_bar_line_chart') {
            const props = JSON.parse(toolCall.function.arguments) as LineBarGraphProps
            return (
              <BotCard key={toolCall.id}>
                <LineBarGraph props={props} />
              </BotCard>
            )
          } else if (toolCall.function.name == 'show_pie_chart') {
            const props = JSON.parse(toolCall.function.arguments) as PieDoughnutProps
            return (
              <BotCard key={toolCall.id}>
                <PieChart props={props} />
              </BotCard>
            )
          }
        })
      }
      return <BotMessage content={message.content} />
    case 'tool':
      if (message.name === 'query_database' || message.name === 'correlation') {
        if (message.data) {
          const args = message.data as { query: string }
          const output = JSON.stringify(JSON.parse(message.content).output)
          return <SqlOutputDialog sql={args.query} output={output}/>
        }
      }
      return null
    default:
      console.log('Unknown message role:', message.role)
      return null
  }
};
