import { Composition, Still } from 'remotion';
import { DuetImage } from './DuetImage';
import { DUET_FRAMES, DuetClip, type DuetProps } from './DuetClip';

// Props come from scripts/duet.mjs (real data read at render time). Without them the clip
// says how to load data instead of showing any number.
const empty: DuetProps = { data: null, layout: 'half' };

export const Root: React.FC = () => (
  <>
    <Composition
      id="DuetHalf"
      component={DuetClip}
      width={1080}
      height={960}
      fps={30}
      durationInFrames={DUET_FRAMES}
      defaultProps={empty}
    />
    <Composition
      id="DuetFull"
      component={DuetClip}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={DUET_FRAMES}
      defaultProps={{ ...empty, layout: 'full' }}
    />
    <Still
      id="DuetImageHalf"
      component={DuetImage}
      width={1080}
      height={960}
      defaultProps={{ data: null, layout: 'half' as const }}
    />
    <Still
      id="DuetImageFull"
      component={DuetImage}
      width={1080}
      height={1920}
      defaultProps={{ data: null, layout: 'full' as const }}
    />
  </>
);
