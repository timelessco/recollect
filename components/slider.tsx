import React, { useState } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { styled } from '@stitches/react';

const StyledSlider = styled(SliderPrimitive.Root, {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  userSelect: 'none',
  touchAction: 'none',
  width: 200,

  '&[data-orientation="horizontal"]': {
    height: 20,
  },

  '&[data-orientation="vertical"]': {
    flexDirection: 'column',
    width: 20,
    height: 100,
  },
});

const StyledTrack = styled(SliderPrimitive.Track, {
  // backgroundColor: blackA.blackA10,
  backgroundColor: 'black',
  position: 'relative',
  flexGrow: 1,
  borderRadius: '9999px',

  '&[data-orientation="horizontal"]': { height: 3 },
  '&[data-orientation="vertical"]': { width: 3 },
});

const StyledRange = styled(SliderPrimitive.Range, {
  position: 'absolute',
  backgroundColor: 'red',
  borderRadius: '9999px',
  height: '100%',
});

const StyledThumb = styled(SliderPrimitive.Thumb, {
  all: 'unset',
  display: 'block',
  width: 20,
  height: 20,
  backgroundColor: 'white',
  boxShadow: `0 2px 10px black`,
  borderRadius: 10,
  '&:hover': { backgroundColor: 'blue' },
  '&:focus': { boxShadow: `0 0 0 5px gray` },
});

const Slider = (props) => {
  // const [value, setValue] = useState([30]);
  const { value, onValueChange } = props;

  return (
    <StyledSlider
      // defaultValue={[20]}
      max={50}
      min={10}
      step={10}
      aria-label="Volume"
      onValueChange={onValueChange}
      value={value}
      // value={value}
      // onValueChange={(v) => setValue(v)}
    >
      <StyledTrack>
        <StyledRange />
      </StyledTrack>
      <StyledThumb />
    </StyledSlider>
  );
};

export default Slider;
