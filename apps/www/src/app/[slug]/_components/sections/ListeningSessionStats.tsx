import type { UserListeningHistory } from "@workspace/database/schema";
import SessionTimeline from "./SessionTimeline";
import StatsCard from "../cards/StatsCard";

interface Props {
  session: NonNullable<UserListeningHistory["longestSession"]>;
}

export default function ListeningSessionStats({ session }: Props) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold mb-4">Listening Sessions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatsCard title="Total Sessions" value={session.totalSessions} />
        <StatsCard
          title="Duration"
          value={`${session.durationMinutes.toFixed(0)} min`}
        />
        <StatsCard
          title="Longest Session"
          value={`${(session.durationMinutes / 60).toFixed(1)} h`}
        />
      </div>
      <SessionTimeline session={session} />
    </div>
  );
}
