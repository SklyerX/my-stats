import { getCurrentSession } from "@/auth/session";
import { getUrl } from "@/lib/utils";
import { db } from "@workspace/database/connection";
import { redirect } from "next/navigation";
import CreateWebhookModal from "../_components/webhooks/create-webhook-modal";
import WebhookPage from "../_components/webhooks/webhook-page";

export default async function WebhooksPage() {
  const { user } = await getCurrentSession();

  if (!user) redirect(`${getUrl()}/login`);

  const webhook = await db.query.webhooks.findFirst({
    where: (fields, { eq }) => eq(fields.userId, user.id),
    with: {
      logs: {
        orderBy: (fields, { desc }) => desc(fields.createdAt),
      },
    },
  });

  return webhook ? (
    <WebhookPage webhookData={webhook} />
  ) : (
    <div>
      <div className="flex items-center justify-between">
        <div className="w-full">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold">Webhook</h3>
            <CreateWebhookModal />
          </div>
          <p className="text-muted-foreground">
            Setup a webhook system and get notified about your account!
          </p>
        </div>
      </div>
    </div>
  );
}
