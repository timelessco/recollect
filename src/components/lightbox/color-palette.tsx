import { useState } from "react";

import { useTheme } from "next-themes";

import { getColorName } from "@/utils/colorUtils";

import { Tooltip } from "../ui/recollect/tooltip";

interface ColorPaletteProps {
  colors: string[];
}

export function ColorPalette({ colors }: ColorPaletteProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  if (colors.length === 0) {
    return null;
  }

  const getMarginClass = (index: number) => {
    if (index === 0) {
      return "";
    }
    return isExpanded ? "ml-1" : "-ml-2";
  };

  const adjustColor = (hex: string) => {
    if (!isDarkMode) {
      return hex;
    }
    const lower = hex.toLowerCase();
    if (lower === "#ffffff") {
      return "#000000";
    }
    if (lower === "#000000") {
      return "#ffffff";
    }
    return hex;
  };

  const handleCopy = (hex: string, index: number) => {
    void navigator.clipboard.writeText(hex);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 1500);
  };

  return (
    <div
      className="flex items-center"
      onMouseEnter={() => {
        setIsExpanded(true);
      }}
      onMouseLeave={() => {
        setIsExpanded(false);
        setCopiedIndex(null);
      }}
    >
      {colors.map((hex, index) => (
        <div
          className={`transition-[margin] duration-200 ${getMarginClass(index)}`}
          key={hex}
          style={{ zIndex: colors.length - index }}
        >
          <Tooltip content={copiedIndex === index ? "Copied!" : `${getColorName(hex)} (${hex})`}>
            <button
              className="h-6 w-6 rounded-full border border-gray-200 dark:border-gray-700"
              onClick={() => {
                handleCopy(hex, index);
              }}
              style={{ backgroundColor: adjustColor(hex) }}
              type="button"
            />
          </Tooltip>
        </div>
      ))}
    </div>
  );
}
