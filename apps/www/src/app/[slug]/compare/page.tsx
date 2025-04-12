import { getCurrentSession } from "@/auth/session";
import { serverClient } from "@/server/trpc/server-client";
import type { TIME_RANGE } from "@/types/spotify";
import { redirect } from "next/navigation";
import React from "react";

interface Props {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Compare({ params, searchParams }: Props) {
  // const { slug } = await params;
  // const timeRange = (await searchParams).timeRange;

  // const { user, session } = await getCurrentSession();

  // if (!user || !session) redirect(`/${slug}`);

  // const comparison = await serverClient.user.compare({
  //   slug,
  //   timeRange: timeRange as TIME_RANGE,
  // });

  return <div>coming soon</div>;
}
