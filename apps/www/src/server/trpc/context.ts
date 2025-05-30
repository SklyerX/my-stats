import type { inferAsyncReturnType } from "@trpc/server";
import type { CreateNextContextOptions } from "@trpc/server/adapters/next";

export async function createContext(opts: CreateNextContextOptions) {
  const { req, res } = opts;

  return {
    req,
    res,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
