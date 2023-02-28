import {
  Slider as AdaptSlider,
  SliderThumb,
  SliderTrack,
  useSliderBaseState,
  useSliderState,
  useSliderThumbState,
  type SliderBaseStateProps,
  type SliderThumbStateProps,
} from "@adaptui/react";
import * as React from "react";

export type SliderBasicProps = SliderBaseStateProps;

export type SliderThumbProps = SliderThumbStateProps;

const Thumb = (props: SliderThumbProps) => {
  const { state } = props;
  const sliderThumb = useSliderThumbState(props);
  const { index } = props;
  // disabling as this is part of lib
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { getThumbPercent } = state;

  return (
    <div
      className="slider-thumb"
      style={{ left: `calc(${getThumbPercent(index) * 100}%)` }}
    >
      <SliderThumb state={sliderThumb} className="slider-thumb-handle" />
    </div>
  );
};

const Slider = (props: SliderBasicProps) => {
  const { label, orientation, isDisabled } = props;
  const sliderLabel = `${(label as string) || "Styled"} Slider`;
  const state = useSliderBaseState(props);
  const slider = useSliderState({ ...props, "aria-label": sliderLabel, state });
  // disabling as this is part of lib
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { getValuePercent, values } = state;

  return (
    <AdaptSlider className="chakra-slider-group" state={slider}>
      <div className="slider">
        <SliderTrack state={slider} className="slider-track-container">
          <div className="slider-track" />
          <div
            className="slider-filled-track"
            style={{ width: `${getValuePercent(values[0]) * 100}%` }}
          />
        </SliderTrack>

        <Thumb
          index={0}
          state={state}
          orientation={orientation}
          isDisabled={isDisabled}
          trackRef={slider.trackRef}
          aria-label="Thumb"
        />
      </div>
    </AdaptSlider>
  );
};

export default Slider;
