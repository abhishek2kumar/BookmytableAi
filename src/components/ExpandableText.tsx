import { useState } from "react";
import { cn } from "../lib/utils";

export const ExpandableText = ({ text, className }: { text: string; className?: string }) => {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  if (text.length <= 130) {
    return <p className={cn("text-slate-500 text-sm mt-3 leading-relaxed", className)}>{text}</p>;
  }

  return (
    <p className={cn("text-slate-500 text-sm mt-3 leading-relaxed", className)}>
      {expanded ? (
        text
      ) : (
        <>
          {text.substring(0, 130)}...{" "}
          <span
            className="font-bold text-slate-700 cursor-pointer"
            onClick={() => setExpanded(true)}
          >
            more
          </span>
        </>
      )}
    </p>
  );
};
