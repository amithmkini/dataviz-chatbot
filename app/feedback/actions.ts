'use server'

import { z } from 'zod'
import { kv } from '@vercel/kv'
import { createClient, LibsqlError, ResultSet } from '@libsql/client/web'

import { FeedbackSchema } from "@/lib/utils"
import { auth } from '@/auth'

interface Result {
  type: string,
  message: string
}

type FeedbackData = z.infer<typeof FeedbackSchema>;

export async function submitFeedback(
  _prevState: Result | undefined,
  formData: FormData
) : Promise<Result | undefined> {

  const session = await auth()

  if (!session?.user) {
    return {
      type: 'error',
      message: 'Unauthorized'
    }
  }

  const parsedFormData = FeedbackSchema.parse(
    Object.fromEntries(formData.entries())
  )

  const userId = session.user.id as string
  const data = {
    userId,
    ...parsedFormData
  }
  
  const columnDefinitions = Object.keys(data).map(key => {
    switch (key) {
      case 'userId':
        return `${key} TEXT PRIMARY KEY`;
      case 'otherFeedback':
        return `${key} TEXT`;
      default:
        return `${key} INTEGER NOT NULL`;
    }
  }).join(', ');

  const tableName = process.env.TURSO_TABLE_NAME || 'Feedback'
  const createTableSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefinitions});`;

  const keys = Object.keys(data);
  const placeholders = keys.map(key => `:${key}`).join(', ');
  const insertStatement = `REPLACE INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`;

  try {
    if (process.env.TURSO_DATABASE_URL === undefined ||
        process.env.TURSO_AUTH_TOKEN === undefined) {
      return {
        type: 'error',
        message: 'Database configuration error'
      }
    }

    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    
    await client.batch([
      {
        sql: createTableSQL,
        args: {}
      },
      {
        sql: insertStatement,
        args: data
      }
    ], "write")

    return {
      type: 'success',
      message: 'Feedback submitted successfully'
    }
  } catch (error) {
    if (error instanceof LibsqlError) {
      return {
        type: 'error',
        message: error.message
      }
    }
    return {
      type: 'error',
      message: 'An unexpected error occurred'
    }
  }
}