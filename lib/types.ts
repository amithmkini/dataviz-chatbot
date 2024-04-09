import { Message } from 'ai'

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