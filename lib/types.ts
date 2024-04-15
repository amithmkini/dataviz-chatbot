import { JSONValue, Message } from 'ai'

export interface Chat extends Record<string, any> {
  id: string
  title: string
  createdAt: Date
  userId: string
  path: string
  messages: Message[]
  databaseUrl: string
  databaseAuthToken: string
  sharePath?: string
}

export type ServerActionResult<Result> = Promise<
  | Result
  | {
      error: string
    }
>

export interface Session {
  user: {
    id: string
    email: string
  }
}

export interface AuthResult {
  type: string
  message: string
}

export interface User extends Record<string, any> {
  id: string
  email: string
  password: string
  salt: string
}

export interface LineBarGraphProps {
  title: string
  type: 'line' | 'bar'
  x: {
    label: string
    data: string[]
  }
  y1: {
    label: string
    data: number[]
  }
  y2?: {
    label: string
    data: number[]
  }
}

export interface PieDoughnutProps {
  title: string
  type: 'pie' | 'doughnut'
  labels: string[]
  tooltip: string
  dataset: number[]
}

// ai/rsc types
export type ToolCallResponse = {
  tool_call_id: string;
  function_name: string;
  function_args?: JSONValue;
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