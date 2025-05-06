import React from "react";
import {
  ArrowRight,
  LayoutDashboard,
  Key,
  Gauge,
  Webhook,
  Book,
} from "lucide-react";
import { getCurrentSession } from "@/auth/session";
import { redirect } from "next/navigation";
import { getUrl } from "@/lib/utils";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export default async function DeveloperDashboard() {
  const { user } = await getCurrentSession();

  if (!user) redirect(`${getUrl()}/login`);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome, {user.username}</h1>
        <p className="text-gray-600">
          Access all your developer resources from this dashboard.
        </p>
      </div>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Where to Find Everything</CardTitle>
          <CardDescription>
            Quick links to all the sections in your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-md hover:bg-background">
              <div className="p-2 bg-blue-100 rounded-md">
                <Key className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">API Keys</h3>
                <p className="text-sm text-gray-600">
                  Manage your API keys and create new ones.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-md hover:bg-background">
              <div className="p-2 bg-green-100 rounded-md">
                <Gauge className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium">Usage</h3>
                <p className="text-sm text-gray-600">
                  Monitor your API usage and billing information.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-md hover:bg-background">
              <div className="p-2 bg-purple-100 rounded-md">
                <Webhook className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium">Webhooks</h3>
                <p className="text-sm text-gray-600">
                  Configure webhooks to receive real-time updates.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-md hover:bg-background">
              <div className="p-2 bg-amber-100 rounded-md">
                <Book className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-medium">Documentation</h3>
                <p className="text-sm text-gray-600">
                  Explore our comprehensive API documentation.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Need Help Getting Started?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Check out our documentation for guides, examples, and API reference.
          </p>
          <Link
            href={getUrl("docs")}
            target="_blank"
            className="inline-flex items-center text-blue-600 font-medium hover:text-blue-400"
          >
            Go to Documentation
            <ArrowRight className="ml-1 w-4 h-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
