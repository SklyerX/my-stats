import type {
  WebhookLogs as WebhookLogsType,
  Webhooks,
} from "@workspace/database/schema";
import { UsageChart } from "./usage-chart";
import WebhookLogs from "./webhook-logs";
import SettingsDialog from "./settings-dialog";

interface Props {
  webhookData: Webhooks & {
    logs: WebhookLogsType[];
  };
}

export default function WebhookPage({ webhookData }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-2xl font-semibold">{webhookData.name}</h3>
        <SettingsDialog
          webhookName={webhookData.name}
          webhookUrl={webhookData.url}
        />
      </div>
      <UsageChart logs={webhookData.logs} />
      <WebhookLogs logs={webhookData.logs} />
    </div>
  );
}
