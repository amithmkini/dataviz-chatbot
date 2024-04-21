import { createClient } from "@libsql/client/web";

export async function GET() {

  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL || '',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    const tableName = process.env.TURSO_DEMO_TABLE || 'Demo'

    const tables = await client.execute(
      `SELECT name, url, authtoken FROM ${tableName};`
    )
    return Response.json(tables.rows)
  } catch (e) {
    return Response.json({})
  }
}