import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: "emerald" | "blue" | "amber" | "red" | "purple";
  className?: string;
}

const colors = {
  emerald: { icon: "bg-emerald-100 text-emerald-600", trend: "text-emerald-600" },
  blue: { icon: "bg-blue-100 text-blue-600", trend: "text-blue-600" },
  amber: { icon: "bg-amber-100 text-amber-600", trend: "text-amber-600" },
  red: { icon: "bg-red-100 text-red-600", trend: "text-red-600" },
  purple: { icon: "bg-purple-100 text-purple-600", trend: "text-purple-600" },
};

export function StatCard({ title, value, icon: Icon, trend, trendUp, color = "emerald", className }: StatCardProps) {
  const c = colors[color];
  return (
    <div className={cn("bg-white rounded-xl border border-gray-200 p-5", className)}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={cn("p-2 rounded-lg", c.icon)}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {trend && (
        <p className={cn("text-xs mt-1", trendUp ? "text-emerald-600" : "text-red-500")}>
          {trendUp ? "↑" : "↓"} {trend}
        </p>
      )}
    </div>
  );
}
