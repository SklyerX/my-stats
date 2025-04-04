import React from "react";

interface Props {
  title: string;
  value: string | number;
}

export default function StatsCard({ title, value }: Props) {
  return (
    <div className="bg-gradient-to-br from-indigo-900/30 to-indigo-800/20 p-6 rounded-xl border border-indigo-700/30">
      <h3 className="text-lg font-medium text-indigo-400 mb-2">{title}</h3>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
