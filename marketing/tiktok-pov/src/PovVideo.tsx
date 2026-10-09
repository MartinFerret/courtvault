import type React from 'react';
import {springTiming, TransitionSeries} from '@remotion/transitions';
import {slide} from '@remotion/transitions/slide';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {C} from './brand/theme';
import {CtaScene} from './scenes/CtaScene';
import {HookScene} from './scenes/HookScene';
import {RookieScene} from './scenes/RookieScene';
import {SheetScene} from './scenes/SheetScene';
import {SolutionScene} from './scenes/SolutionScene';
import {TabsScene} from './scenes/TabsScene';

/** Cuts every 2 to 3 seconds; each cut is a horizontal swipe, like the carousel it comes from. */
const swipe = () => springTiming({durationInFrames: 10, config: {damping: 200}});

/** `topps`: version B with official card images (only once the Topps permission is confirmed for social media). */
export const PovVideo: React.FC<{topps: boolean}> = ({topps}) => {
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <TransitionSeries>
        <TransitionSeries.Sequence name="1. Hook" durationInFrames={84} premountFor={fps}>
          <HookScene
            text="POV: YOU OWN 200 NBA CARDS AND HAVE NO IDEA WHAT THEY'RE WORTH"
            keyword="NO IDEA"
            topps={topps}
            photo=""
            still={false}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: 'from-right'})} timing={swipe()} />
        <TransitionSeries.Sequence name="2. eBay tabs" durationInFrames={72} premountFor={fps}>
          <TabsScene text="YOU CHECK EBAY… ONE CARD AT A TIME" keyword="ONE CARD AT A TIME" topps={topps} still={false} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: 'from-right'})} timing={swipe()} />
        <TransitionSeries.Sequence name="3. Spreadsheet" durationInFrames={78} premountFor={fps}>
          <SheetScene
            text="YOUR SPREADSHEET IS FROM 2023. HALF THE PRICES ARE WRONG"
            keyword="HALF THE PRICES ARE WRONG"
            still={false}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: 'from-right'})} timing={swipe()} />
        <TransitionSeries.Sequence name="4. Rookie" durationInFrames={90} premountFor={fps}>
          <RookieScene
            text="HE DROPS 32 LAST NIGHT. DID YOUR ROOKIE GO UP?"
            keyword="DID YOUR ROOKIE GO UP?"
            subtitle="no clue."
            still={false}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: 'from-right'})} timing={swipe()} />
        <TransitionSeries.Sequence name="5. Solution" durationInFrames={96} premountFor={fps}>
          <SolutionScene
            text="NOW, EVERY MORNING: WHAT LAST NIGHT DID TO YOUR CARDS"
            keyword="EVERY MORNING"
            screens={['screen-recap.png', 'screen-game.png', 'screen-court.png']}
            still={false}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: 'from-right'})} timing={swipe()} />
        <TransitionSeries.Sequence name="6. CTA" durationInFrames={90} premountFor={fps}>
          <CtaScene topps={topps} brand="HoopTicker" tagline="FREE · LINK IN BIO" keyword="FREE" still={false} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
