import { useState } from "react";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { getColorName } from "@/utils/colorUtils";

interface ColorPaletteProps {
  colors: string[];
}

export function ColorPalette({ colors }: ColorPaletteProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (colors.length === 0) {
    return null;
  }

  return (
    <TooltipPrimitive.Provider>
      <div
        className="group flex items-center"
        onMouseLeave={() => {
          setCopiedIndex(null);
        }}
      >
        {colors.map((hex, index) => (
          <div
            className={`transition-[margin] duration-200 ${index === 0 ? "" : "-ml-2 group-hover:ml-1"}`}
            key={hex}
            style={{ zIndex: colors.length - index }}
          >
            <TooltipPrimitive.Root>
              <TooltipPrimitive.Trigger
                className="h-6 w-6 cursor-pointer rounded-full border border-gray-200 dark:border-gray-700"
                closeOnClick={false}
                onClick={() => {
                  void navigator.clipboard.writeText(hex);
                  setCopiedIndex(index);
                }}
                onMouseEnter={() => {
                  setCopiedIndex(null);
                }}
                style={{ backgroundColor: hex }}
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
