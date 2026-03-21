import { Slider } from "@base-ui/react/slider";

import { useBookmarksViewUpdate } from "../../hooks/useBookmarksViewUpdate";
import useGetViewValue from "../../hooks/useGetViewValue";

export function BookmarksViewSlider() {
  const bookmarksColumns = useGetViewValue("moodboardColumns", [10]);
  const { setBookmarksView } = useBookmarksViewUpdate();

  return (
    <Slider.Root
      key={String(bookmarksColumns)}
      aria-label="moodboard-cols-slider Slider"
      className="relative flex w-full touch-none items-center py-[7px] select-none"
      defaultValue={bookmarksColumns as number[]}
      max={50}
      min={10}
      onValueCommitted={(value) => {
        const normalizedValue = Array.isArray(value)
          ? (value.slice() as number[])
          : [value as number];
        if (normalizedValue[0] !== bookmarksColumns?.[0]) {
          setBookmarksView(normalizedValue, "columns");
        }
      }}
      step={10}
    >
      <SliderContent />
    </Slider.Root>
  );
}

const SliderContent = () => (
  <Slider.Control className="flex w-full cursor-pointer items-center">
    <Slider.Track className="h-1 w-full cursor-pointer rounded-xs bg-gray-300">
      <Slider.Indicator className="rounded-xs bg-gray-950" />
      <Slider.Thumb className="flex size-4 cursor-pointer items-center justify-center rounded-full bg-white shadow-[0_0_1px_0_rgb(0_0_0/40%),0_1px_2px_0_rgb(0_0_0/15%)] select-none focus-within:shadow-[0_0_0_2px_var(--color-gray-900)]" />
    </Slider.Track>
  </Slider.Control>
);
