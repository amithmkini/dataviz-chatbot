<h1 align="center">DataViz Chatbot</h1>

<p align="center">
  AI chatbot for data visualization and analytics
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a> ·
  <a href="#connecting-databases"><strong>Connecting Databases</strong></a>
</p>
<br/>

## Features

- [Next.js](https://nextjs.org) App Router
- React Server Components (RSCs), Suspense, and Server Actions
- [Vercel AI SDK](https://sdk.vercel.ai/docs) for streaming chat UI

## Running locally

First, you need to create either a Vercel KV or Upstash Redis DB to store the chatbot state.
After that, you will need to use the environment variables [defined in `.env.example`](.env.example) to run Next.js AI Chatbot. 

```bash
pnpm install
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000/).

If you don't want to setup Upstash, you can run the Docker compose file to start a Redis DB with http server locally:

```bash
docker compose up
```

Then, adjust the environment variables in the `.env` file to point to the local Redis server.
```bash
KV_URL="http://localhost:8079"
KV_REST_API_URL="http://localhost:8079"
KV_REST_API_TOKEN="test"
KV_REST_API_READ_ONLY_TOKEN="test"
```

## Connecting Databases

Dataviz Chatbot makes use of [Turso](https://turso.tech) SQLite DBs for querying data. Create a DB on Turso and pass in the URL and the authToken to the application.
