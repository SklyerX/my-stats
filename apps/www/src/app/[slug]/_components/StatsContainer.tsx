import type { InternalTopUserStats } from "@/types/response";
import React, { useState } from "react";

interface Props {
  initialStats: InternalTopUserStats["stats"];
}

export default function StatsContainer({ initialStats }: Props) {
  const [stats, setStats] = useState(initialStats);
  return <div>StatsContainer</div>;
}
