import type { UserListeningHistory } from "@workspace/database/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import React from "react";

interface Props {
  session: NonNullable<UserListeningHistory["longestSession"]>;
}

export default function SessionTimeline({ session }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Start Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Start Time</h3>
            <p className="text-md font-semibold">
              {new Date(session.sessionStart).toLocaleString()}
            </p>
          </div>
          <div className="flex-1 h-3 bg-zinc-700 rounded-full mx-4 relative">
            <div
              className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-500 rounded-full"
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">End Time</h3>
            <p className="text-md font-semibold">
              {new Date(session.sessionEnd).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
