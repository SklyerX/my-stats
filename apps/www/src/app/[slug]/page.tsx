import type { InternalTopUserStats } from "@/types/response";
import Image from "next/image";
import { notFound } from "next/navigation";
import React from "react";
import UserProfile from "./_components/UserProfile";
import StatsContainer from "./_components/StatsContainer";

interface Props {
  params: {
    slug: string;
  };
  searchParams: {
    time_range?: "short_term" | "medium_term" | "long_term";
  };
}

export default async function UserPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { time_range } = await searchParams;

  const response = await fetch(
    `http://localhost:3000/api/user/top/${slug}?time_range=${time_range ?? "short_term"}`,
  );

  if (!response.ok) return notFound();

  const data = (await response.json()) as InternalTopUserStats;

  return (
    <div className="container mx-auto max-w-4xl w-full mt-20">
      <UserProfile user={data.user} />
      <StatsContainer initialStats={data.stats} />
    </div>
  );
}
