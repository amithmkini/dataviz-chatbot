import 'server-only'

import { 
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
import dedent from 'dedent'
import { createClient, LibsqlError, ResultSet } from '@libsql/client/web'
import OpenAI from 'openai'
import { ChatCompletionMessageParam } from 'openai/resources'
import { kv } from '@vercel/kv'

import { saveChat } from '@/app/actions'
import { auth } from '@/auth'
import { LineBarGraph, SqlOutputDialog } from '@/components/graphs'
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
  pie_chart_func
} from './schemas'
import { system_prompt } from './prompt'
import { PieChart } from '@/components/graphs/pie'

export const runtime = 'edge'
export const preferredRegion = 'home'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
})

const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
const temperature: number =  +(process.env.OPENAI_MODEL_TEMPERATURE || 0.5)

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
          }

          newMessages.push({
            tool_call_id: toolCall.id,
            function_name: toolCall.func.name,
            function_args: toolCall.func.arguments as JSONValue,
            tool_call_result: output
          })
        }

        // Update aiState
        aiState.done({
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
        // Cleanup. Close streaming UIs.
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
    display: spinnerWithResponseUI.value
  }
}


export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    setDatabaseCreds
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
      databaseUrl: aiState.databaseUrl,
      databaseAuthToken: aiState.databaseAuthToken,
      display: getDisplayComponent(message)
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
          if (toolCall.function.name == 'query_database') {
            const args = JSON.parse(toolCall.function.arguments)
            return (<SystemMessage key={toolCall.id}>SQL Query: {args.query}</SystemMessage>)
          } else if (toolCall.function.name == 'show_bar_line_chart') {
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
      if (message.name === 'query_database') {
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
