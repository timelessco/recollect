import { useState } from "react";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { useTheme } from "next-themes";

import { getColorName } from "@/utils/colorUtils";

interface ColorPaletteProps {
  colors: string[];
}

export function ColorPalette({ colors }: ColorPaletteProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
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

  return (
    <TooltipPrimitive.Provider>
      <div
        className="flex items-center"
        onMouseEnter={() => {
          setIsExpanded(true);
        }}
        onMouseLeave={() => {
          setIsExpanded(false);
          setHoveredIndex(null);
          setCopiedIndex(null);
        }}
      >
        {colors.map((hex, index) => (
          <div
            className={`transition-[margin] duration-200 ${getMarginClass(index)}`}
            key={hex}
            onMouseEnter={() => {
              setHoveredIndex(index);
              setCopiedIndex(null);
            }}
            onMouseLeave={() => {
              setHoveredIndex(null);
            }}
            style={{ zIndex: colors.length - index }}
          >
            <TooltipPrimitive.Root open={hoveredIndex === index || copiedIndex === index}>
              <TooltipPrimitive.Trigger
                className="h-6 w-6 cursor-pointer rounded-full border border-gray-200 dark:border-gray-700"
                onClick={() => {
                  void navigator.clipboard.writeText(hex);
                  setCopiedIndex(index);
                }}
                style={{ backgroundColor: adjustColor(hex) }}
              />
              <TooltipPrimitive.Portal>
                <TooltipPrimitive.Positioner className="z-10000" sideOffset={8}>
                  <TooltipPrimitive.Popup className="rounded-xl bg-gray-900 px-2 py-1 text-13 font-450 text-gray-0 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0">
                    {copiedIndex === index ? "Copied!" : `${getColorName(hex)} (${hex})`}
                  </TooltipPrimitive.Popup>
                </TooltipPrimitive.Positioner>
              </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
          </div>
        ))}
      </div>
    </TooltipPrimitive.Provider>
  );
}
