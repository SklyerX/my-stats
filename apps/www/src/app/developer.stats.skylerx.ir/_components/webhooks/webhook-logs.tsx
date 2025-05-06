import type { WebhookLogs as WebhookLogsType } from "@workspace/database/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { format } from "date-fns/format";

interface Props {
  logs: WebhookLogsType[];
}

export default function WebhookLogs({ logs }: Props) {
  return (
    <Card className="mt-5">
      <CardHeader>
        <CardTitle>Recent Deliveries</CardTitle>
      </CardHeader>
      <CardContent className="max-h-96 overflow-y-scroll">
        <ul className="space-y-1 text-sm font-mono text-muted-foreground">
          {logs.map((log) => (
            <li key={log.id}>
              {log.status === "success" ? "✅" : "❌"}{" "}
              {format(log.createdAt as Date, "yyyy-MM-dd hh:mm:ss")} -{" "}
              {log.status === "success" ? "Sent" : "Failed to send"}{" "}
              {log.metadata?.event} for user @{log.metadata?.user} -{" "}
              {log.metadata?.for} - {log.metadata?.value} -{" "}
              {log.metadata?.displayName}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
