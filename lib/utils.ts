import { clsx, type ClassValue } from 'clsx'
import { customAlphabet } from 'nanoid'
import { twMerge } from 'tailwind-merge'
import { z } from 'zod'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const nanoid = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  7
) // 7-character random string

export async function fetcher<JSON = any>(
  input: RequestInfo,
  init?: RequestInit
): Promise<JSON> {
  const res = await fetch(input, init)

  if (!res.ok) {
    const json = await res.json()
    if (json.error) {
      const error = new Error(json.error) as Error & {
        status: number
      }
      error.status = res.status
      throw error
    } else {
      throw new Error('An unexpected error occurred')
    }
  }

  return res.json()
}

export function formatDate(input: string | number | Date): string {
  const date = new Date(input)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

export const runAsyncFnWithoutBlocking = (
  fn: (...args: any) => Promise<any>
) => {
  fn()
}

export const getStringFromBuffer = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

export enum ResultCode {
  InvalidCredentials = 'INVALID_CREDENTIALS',
  InvalidSubmission = 'INVALID_SUBMISSION',
  UserAlreadyExists = 'USER_ALREADY_EXISTS',
  UnknownError = 'UNKNOWN_ERROR',
  UserCreated = 'USER_CREATED',
  UserLoggedIn = 'USER_LOGGED_IN'
}

export const getMessageFromCode = (resultCode: string) => {
  switch (resultCode) {
    case ResultCode.InvalidCredentials:
      return 'Invalid credentials!'
    case ResultCode.InvalidSubmission:
      return 'Invalid submission, please try again!'
    case ResultCode.UserAlreadyExists:
      return 'User already exists, please log in!'
    case ResultCode.UserCreated:
      return 'User created, welcome!'
    case ResultCode.UnknownError:
      return 'Something went wrong, please try again!'
    case ResultCode.UserLoggedIn:
      return 'Logged in!'
  }
}

const IntScale = z.coerce.number().int().min(1).max(5);

export const FeedbackSchema = z.object({
  uiPurposeClear: IntScale.describe(
    "The UI clearly indicated the purpose of the system."
  ),
  chatbotResponseRelevant: IntScale.describe(
    "The chatbot response was relevant to the query"
  ),
  promptSuggestionHelpful: IntScale.describe(
    "The prompt suggestion in the beginning helped me begin the conversation."
  ),
  easyToEditRefineRecover: IntScale.describe(
    "It is easy to edit, refine or recover when the chatbot is wrong"
  ),
  zoomFunctionHelpful: IntScale.describe(
    "The zoom function can help me understand the graph better and I can ask questions about the graph"
  ),
  chatbotRemembersContext: IntScale.describe(
    "The chatbot can remember the context of the conversation"
  ),
  chatbotShowedDesiredGraph: IntScale.describe(
    "The chatbot showed me the graph that I wanted to see"
  ),
  otherFeedback: z.string().describe(
    "Any other feedback you would like to provide?"
  )
});
