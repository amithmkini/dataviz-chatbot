import 'server-only'

import { createClient, LibsqlError, ResultSet } from "@libsql/client/web";
import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  createStreamableValue
} from 'ai/rsc'
import OpenAI from 'openai'
import dedent from 'dedent'
import { kv } from '@vercel/kv'

import {
  spinner,
  BotCard,
  BotMessage,
  SystemMessage,
  Stock,
} from '@/components/stocks'


import {
  formatNumber,
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/stocks/message'
import { Chat } from '@/lib/types'
import { auth } from '@/auth'
import { ChatCompletionMessageParam } from 'openai/resources';
import { JSONValue, OpenAIStream, Tool, ToolCall, ToolCallPayload } from 'ai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
})

const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'

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
    const joined = output.rows as Array<JSONValue>

    return {
      success: true,
      output: joined
    }

  } catch (e) {
    if (e instanceof LibsqlError) {
      return {
        success: false,
        output: e.message
      }
    }
  }
  return {
    success: false,
    output: "Unknown error"
  }
}

async function confirmPurchase(symbol: string, price: number, amount: number) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  const purchasing = createStreamableUI(
    <div className="inline-flex items-start gap-1 md:items-center">
      {spinner}
      <p className="mb-2">
        Purchasing {amount} ${symbol}...
      </p>
    </div>
  )

  const systemMessage = createStreamableUI(null)

  runAsyncFnWithoutBlocking(async () => {
    await sleep(1000)

    purchasing.update(
      <div className="inline-flex items-start gap-1 md:items-center">
        {spinner}
        <p className="mb-2">
          Purchasing {amount} ${symbol}... working on it...
        </p>
      </div>
    )

    await sleep(1000)

    purchasing.done(
      <div>
        <p className="mb-2">
          You have successfully purchased {amount} ${symbol}. Total cost:{' '}
          {formatNumber(amount * price)}
        </p>
      </div>
    )

    systemMessage.done(
      <SystemMessage>
        You have purchased {amount} shares of {symbol} at ${price}. Total cost ={' '}
        {formatNumber(amount * price)}.
      </SystemMessage>
    )

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages.slice(0, -1),
        {
          id: nanoid(),
          role: 'function',
          name: 'showStockPurchase',
          content: JSON.stringify({
            symbol,
            price,
            defaultAmount: amount,
            status: 'completed'
          })
        },
        {
          id: nanoid(),
          role: 'system',
          content: `[User has purchased ${amount} shares of ${symbol} at ${price}. Total cost = ${
            amount * price
          }]`
        }
      ]
    })
  })

  return {
    purchasingUI: purchasing.value,
    newMessage: {
      id: nanoid(),
      display: systemMessage.value
    }
  }
}

const system_prompt = {
  role: 'system',
  content: dedent`
    You are a data analyst with access to a SQL DB. Your task is to answer users question using
    the data from the database. Query the SQLite database and then answer questions or show the charts,
    using the data.

    The database schema is given to you as [Database schema] <schema>. If it's not given, mention that
    you don't have the schema.

    If the users ask you run a SQL query for something, call \`query_database\` to get the results.
    If you want to draw a bar chart, call \`show_chart\` with the title and values.

    Besides that, you can also chat with users and do some calculations if needed.`
}

const tools: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'query_database',
      description: 'Query the database with a SQL query.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The SQL query to run on the database.'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'show_chart',
      description: 'Show a bar chart',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The title of the chart.'
          },
          values: {
            type: 'object',
            description: dedent`
              The x-axis and y-axis values. Should be of the format:
              {
                "x": ["A", "B", "C"],
                "y": [1, 2, 3]
              }
            `,
            properties: {
              x: {
                type: 'array',
                descrption: 'The x-axis values.',
                items: {
                  type: 'string'
                }
              },
              y: {
                type: 'array',
                description: 'The y-axis values.',
                items: {
                  type: 'number'
                }
              }
            }
          },
        },
        required: ['title', 'values']
      }
    }
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

            responseUI.append(
              <>
                <SystemMessage>
                  SQL Query: {query}
                </SystemMessage>
              </>
            )
            output = await query_database(query, aiState)
 
          } else if(toolCall.func.name === 'show_chart') {
            const title = toolCall.func.arguments.title as string
            const values = toolCall.func.arguments.values as { x: string[], y: number[] }
            responseUI.append(
              <>
                <BotCard>
                  <Stock props={{ symbol: "TSLA", price: 140, delta: 1 }} />
                </BotCard>
              </>
            )

            output = {
              success: true,
            }
          }

          newMessages.push({
            tool_call_id: toolCall.id,
            function_name: toolCall.func.name,
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
              content: JSON.stringify(message.tool_call_result),
              tool_call_id: message.tool_call_id,
            }))
          ] as Message[]
        })

        return openai.chat.completions.create({
          model,
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
        // If there's textStream and textNode, nullify them.
        if (textStream && textNode) {
          textStream = createStreamableValue('')
          textNode = <BotMessage content={textStream.value} />

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
      onFinal(completion) {
        responseUI.done()
        aiState.done({
          ...aiState.get(),
        })
      }
    })

    // Start the stream
    const reader = stream.getReader()
    while (true) {
      const { done } = await reader.read()
      if (done) {
        break
      }
    }
  })

  return {
    id: nanoid(),
    display: responseUI.value
  }
}

export type Message = {
  role: 'user' | 'assistant' | 'system' | 'function' | 'data' | 'tool'
  content: string
  id: string
  name?: string,                   // For tool calls
  tool_call_id?: string,
  tool_calls?: string | ToolCall[]
}

type ToolCallResponse = {
  tool_call_id: string;
  function_name: string;
  tool_call_result: JSONValue;
}

export type AIState = {
  chatId: string
  databaseUrl: string
  databaseAuthToken: string
  messages: Message[]
}

export type UIState = {
  id: string
  databaseUrl: string
  databaseAuthToken: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    confirmPurchase,
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
      const title = messages[1]?.content.substring(0, 100) || messages[0].content.substring(0, 100)

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
    .filter(message => (message.role !== 'system' && message.role !== 'tool'))
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
          } else if (toolCall.function.name == 'show_chart') {
            return (
              <BotCard key={toolCall.id}>
                <Stock props={{ symbol: "TSLA", price: 140, delta: 1 }} />
              </BotCard>
            )
          }
        })
      }
      return <BotMessage content={message.content} />
    default:
      console.log('Unknown message role:', message.role)
      return null
  }
};
