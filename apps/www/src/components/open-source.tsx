import { tryCatch } from "@/lib/try-catch";
import { serverClient } from "@/server/trpc/server-client";
import { Card, CardContent } from "@workspace/ui/components/card";
import { CgGitFork } from "react-icons/cg";
import React from "react";
import Link from "next/link";
import { buttonVariants } from "@workspace/ui/components/button";
import { FaGithub } from "react-icons/fa";

export default async function OpenSource() {
  const { data, error } = await tryCatch(serverClient.internal.getCommits());

  return (
    <div className="mt-40">
      <div className="flex flex-col items-center">
        <h3 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Proudly Open Source
        </h3>
        <p className="text-muted-foreground text-xl mb-10 sm:text-center">
          MyStats is committed to open source. We believe in transparency and
          collaboration. Our code is available for anyone to view, use (locally
          and self-hosted), and contribute to.
        </p>
        <div className="w-full flex flex-col md:flex-row md:justify-center gap-3">
          <Link
            href="https://github.com/sklyerx/my-stats"
            target="_blank"
            className={buttonVariants({
              variant: "outline",
              class: "flex items-center gap-2",
            })}
          >
            <FaGithub className="size-7" />
            View on Github
          </Link>
          <Link
            href="https://github.com/sklyerx/my-stats/fork"
            target="_blank"
            className={buttonVariants({
              variant: "ghost",
              class: "flex items-center gap-2",
            })}
          >
            <CgGitFork className="size-7" />
            Fork on Github
          </Link>
        </div>
      </div>
      <div className="my-10">
        <Card>
          <CardContent className="h-96 overflow-scroll">
            <code className="font-mono py-2">
              {data
                ? data.map((commit, key) => (
                    <div
                      className="flex items-center gap-2 my-2"
                      key={`${commit.hash}_${key}`}
                    >
                      <img
                        src={commit.avatar}
                        alt="Avatar"
                        className="size-8 object-cover rounded-full"
                      />
                      <span className="text-purple-400">{commit.type}</span>
                      {commit.hash && (
                        <span className="text-green-400">{commit.hash}</span>
                      )}
                      <span>{commit.action}</span>
                      <span className="text-green-400">
                        {commit.branch || commit.repo}
                      </span>
                      <span className="text-muted-foreground truncate max-w-auto">
                        {commit.message}
                      </span>
                    </div>
                  ))
                : null}
              {error ? (
                <span className="text-muted-foreground">{error.message}</span>
              ) : null}
            </code>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
