import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { Key, BarChart2, RefreshCw, Clock, ArrowRight } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import type { UserUsage } from "@/types";

interface Props {
  data: UserUsage;
}

export default function UsageDashboard({ data }: Props) {
  const totalRequests =
    data?.apiKeys?.reduce(
      (sum, key) => sum + (key.metrics?.total_requests || 0),
      0,
    ) || 0;

  const monthlyLimit = data?.limits?.monthly || 0;
  const remainingRequests = data?.limits?.remaining || 0;
  const usedRequests = monthlyLimit - remainingRequests;
  const usagePercentage =
    monthlyLimit > 0 ? (usedRequests / monthlyLimit) * 100 : 0;

  const lastAccessTimestamp = data?.metadata?.lastAccess;
  const lastAccessDate = lastAccessTimestamp
    ? new Date(Number(lastAccessTimestamp)).toLocaleString()
    : "";

  const endpoints = Object.entries(data?.total || {}).map(
    ([endpoint, count]) => ({
      name: endpoint,
      count: Number(count),
    }),
  );

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">API Usage Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BarChart2 className="h-5 w-5 text-gray-500 mr-2" />
              <span className="text-2xl font-bold">{totalRequests}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Monthly Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">
                {usedRequests} of {monthlyLimit}
              </span>
              <span className="text-sm font-medium">
                {usagePercentage.toFixed(1)}%
              </span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
            <div className="text-xs text-gray-500">
              {remainingRequests} requests remaining this month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Last API Call
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-gray-500 mr-2" />
              <span className="text-sm">{lastAccessDate}</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {data?.metadata?.lastMethod} {data?.metadata?.lastEndpoint}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Keys Section */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Usage statistics for your API keys</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.apiKeys?.length > 0 ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                {data.apiKeys.map((key: { keyHash: string }, idx: number) => (
                  <TabsTrigger key={key.keyHash} value={`key-${idx}`}>
                    Key {idx + 1}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {data.apiKeys.map(
                  (
                    key: {
                      keyHash: string;
                      metrics?: { total_requests?: number };
                    },
                    index: number,
                  ) => (
                    <div key={key.keyHash} className="border rounded-md p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Key className="h-5 w-5 text-gray-500 mr-2" />
                          <span className="font-medium">Key {index + 1}</span>
                          <span className="ml-2 text-xs text-gray-500">
                            {key.keyHash.substring(0, 8)}...
                            {key.keyHash.substring(key.keyHash.length - 8)}
                          </span>
                        </div>
                        <span className="text-sm font-medium">
                          {key.metrics?.total_requests || 0} requests
                        </span>
                      </div>
                    </div>
                  ),
                )}
              </TabsContent>

              {data.apiKeys.map((key, idx) => (
                <TabsContent
                  key={key.keyHash}
                  value={`key-${idx}`}
                  className="space-y-4"
                >
                  <div className="border rounded-md p-4">
                    <div className="flex items-center mb-4">
                      <Key className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="font-medium">Key Details</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {key.keyHash.substring(0, 8)}...
                        {key.keyHash.substring(key.keyHash.length - 8)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">
                          Total Requests
                        </p>
                        <p className="text-2xl font-medium">
                          {key.metrics?.total_requests || 0}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500 mb-1">
                          Last Access
                        </p>
                        <p className="text-sm">
                          {key.usage?.metadata?.lastAccess
                            ? new Date(
                                Number(key.usage.metadata.lastAccess),
                              ).toLocaleString()
                            : ""}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {key.usage?.metadata?.lastMethod}{" "}
                          {key.usage?.metadata?.lastEndpoint}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <p className="text-sm font-medium mb-2">Endpoint Usage</p>
                      {Object.keys(key.usage?.total || {}).length > 0 ? (
                        <div className="space-y-2">
                          {Object.entries(key.usage.total).map(
                            ([endpoint, count], i) => (
                              <div
                                key={i}
                                className="flex justify-between items-center border-b pb-2"
                              >
                                <p className="text-sm font-mono">{endpoint}</p>
                                <p className="text-sm font-medium">
                                  {Number(count)} requests
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          No endpoint data available
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <p className="text-sm text-gray-500">No API keys found</p>
          )}
        </CardContent>
      </Card>

      {/* Endpoint Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Endpoint Usage</CardTitle>
          <CardDescription>Request count by endpoint</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {endpoints.length > 0 ? (
              endpoints
                .sort((a, b) => b.count - a.count)
                .map((endpoint, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center border-b pb-3"
                  >
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-mono truncate">
                        {endpoint.name}
                      </p>
                    </div>
                    <div className="ml-4 flex items-center">
                      <Progress
                        value={
                          (endpoint.count /
                            Math.max(...endpoints.map((e) => e.count))) *
                          100
                        }
                        className="h-2 w-24 mr-4"
                      />
                      <span className="text-sm font-medium w-20 text-right">
                        {endpoint.count} requests
                      </span>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-sm text-gray-500">
                No endpoint data available
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <p className="text-xs text-gray-500">
            Data refreshed as of {new Date().toLocaleString()}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
