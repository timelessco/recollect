import * as React from 'react';

import {
  Slider as AdaptSlider,
  SliderThumb,
  SliderTrack,
  useSliderBaseState,
  useSliderState,
  useSliderThumbState,
  SliderBaseStateProps,
  SliderThumbStateProps,
} from '@adaptui/react';

export type SliderBasicProps = SliderBaseStateProps;

export const Slider = (props: SliderBasicProps) => {
  const { label } = props;
  const sliderLabel = `${label ? label : 'Styled'} Slider`;
  const state = useSliderBaseState(props);
  const slider = useSliderState({ ...props, 'aria-label': sliderLabel, state });
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
          orientation={props.orientation}
          isDisabled={props.isDisabled}
          trackRef={slider.trackRef}
          aria-label="Thumb"
        />
      </div>
    </AdaptSlider>
  );
};

export default Slider;

export type SliderThumbProps = SliderThumbStateProps;

export const Thumb = (props: SliderThumbProps) => {
  const sliderThumb = useSliderThumbState(props);
  const { index } = props;
  const { getThumbPercent } = props.state;

  return (
    <div
      className="slider-thumb"
      style={{ left: `calc(${getThumbPercent(index) * 100}%)` }}
    >
      <SliderThumb state={sliderThumb} className="slider-thumb-handle" />
    </div>
  );
};
