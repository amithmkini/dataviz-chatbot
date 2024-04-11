import { clsx, type ClassValue } from 'clsx'
import { customAlphabet } from 'nanoid'
import { twMerge } from 'tailwind-merge'

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

interface WeatherData {
  date: string;
  averageHumidity: number;
  averageTemperature: number;
}


export const weatherData: WeatherData[] = [
  { date: "2012-10-01", averageHumidity: 88, averageTemperature: 291.8465006697272 },
  { date: "2012-10-02", averageHumidity: 64.91666666666667, averageTemperature: 295.89045048579163 },
  { date: "2012-10-03", averageHumidity: 44.875, averageTemperature: 299.00854166666664 },
  { date: "2012-10-04", averageHumidity: 66.625, averageTemperature: 295.99791666666664 },
  { date: "2012-10-05", averageHumidity: 70.25, averageTemperature: 292.9483333333333 },
  { date: "2012-10-06", averageHumidity: 75.04166666666667, averageTemperature: 292.36875000000003 },
  { date: "2012-10-07", averageHumidity: 74.58333333333333, averageTemperature: 292.92875 },
  { date: "2012-10-08", averageHumidity: 73.25, averageTemperature: 293.91875 },
  { date: "2012-10-09", averageHumidity: 76.20833333333333, averageTemperature: 292.4402083333333 },
  { date: "2012-10-10", averageHumidity: 70.41666666666667, averageTemperature: 291.34270833333335 },
  { date: "2012-10-11", averageHumidity: 62.416666666666664, averageTemperature: 292.47208333333333 },
  { date: "2012-10-12", averageHumidity: 66.95833333333333, averageTemperature: 290.30541666666664 },
  { date: "2012-10-13", averageHumidity: 64.95833333333333, averageTemperature: 289.46750000000003 },
  { date: "2012-10-14", averageHumidity: 64.70833333333333, averageTemperature: 290.64708333333334 },
  { date: "2012-10-15", averageHumidity: 62.375, averageTemperature: 293.56333333333333 },
  { date: "2012-10-16", averageHumidity: 46.130434782608695, averageTemperature: 296.1120833333334 },
  { date: "2012-10-17", averageHumidity: 59.4, averageTemperature: 294.9420833333333 },
  { date: "2012-10-18", averageHumidity: 52.04347826086956, averageTemperature: 296.65749999999997 },
  { date: "2012-10-19", averageHumidity: 51.583333333333336, averageTemperature: 296.90791666666667 },
  { date: "2012-10-20", averageHumidity: 78.25, averageTemperature: 293.86041666666665 },
  { date: "2012-10-21", averageHumidity: 52.130434782608695, averageTemperature: 292.54625 },
  { date: "2012-10-22", averageHumidity: 73.375, averageTemperature: 292.3802083333333 },
  { date: "2012-10-23", averageHumidity: 73.68181818181819, averageTemperature: 291.55791666666664 },
  { date: "2012-10-24", averageHumidity: 65.41666666666667, averageTemperature: 290.68083333333334 },
  { date: "2012-10-25", averageHumidity: 59.708333333333336, averageTemperature: 290.1252083333333 },
  { date: "2012-10-26", averageHumidity: 31.142857142857142, averageTemperature: 291.96750000000003 },
  { date: "2012-10-27", averageHumidity: 31.782608695652176, averageTemperature: 294.33750000000003 },
  { date: "2012-10-28", averageHumidity: 18.52173913043478, averageTemperature: 295.69416666666666 }];
