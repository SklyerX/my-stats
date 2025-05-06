import { getMarkdownContent } from "@/lib/markdown";
import React from "react";

const f = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

export default async function Page() {
  const { markdown, modifiedAt } = await getMarkdownContent("privacy-policy");

  return (
    <div>
      <h2 className="text-5xl font-semibold text-center mb-10">
        Privacy Policy
      </h2>
      <p className="text-muted-foreground mb-10">
        Effective date: {f.format(modifiedAt)}
      </p>
      <div
        className="prose prose-lg dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: markdown }}
      />
    </div>
  );
}
