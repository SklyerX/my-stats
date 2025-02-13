import { serverClient } from "@/server/trpc/server-client";

export default async function Home() {
  const todos = await serverClient.getTodos();

  return <div>{JSON.stringify(todos)}</div>;
}
