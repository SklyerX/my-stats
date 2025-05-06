import CreateAPIKeyModal from "../_components/api-keys/modals/create-api-key-modal";
import { db } from "@workspace/database/connection";
import { getCurrentSession } from "@/auth/session";
import { redirect } from "next/navigation";
import { getUrl } from "@/lib/utils";
import ApiKeyDropdown from "../_components/api-keys/api-key-dropdown";

export default async function ApiKeysPage() {
  const { user } = await getCurrentSession();

  if (!user) redirect(`${getUrl()}/login`);

  const apiKeys = await db.query.apiKeys.findMany({
    where: (fields, { eq }) => eq(fields.userId, user.id),
    orderBy: (fields, { asc }) => asc(fields.createdAt),
    columns: {
      name: true,
      id: true,
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">API Keys</h2>
          <p className="text-muted-foreground">
            You can create / view API keys here. API Keys are used to get access
            to MyStats data
          </p>
        </div>
        <CreateAPIKeyModal />
      </div>
      <div className="space-y-7 mt-10">
        {apiKeys.map((key) => (
          <div className="flex items-center justify-between" key={key.id}>
            <h2 className="text-xl">{key.name}</h2>
            <ApiKeyDropdown keyId={key.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
