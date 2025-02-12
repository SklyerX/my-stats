import { serverClient } from "@/trpc/serverClient";

export default async function Home() {
  const todos = await serverClient.getTodos();

  return <div>{JSON.stringify(todos)}</div>;
}
