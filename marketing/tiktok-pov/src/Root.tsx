import type React from 'react';
import {Composition, Folder} from 'remotion';
import {PovVideo} from './PovVideo';
import {ChatVideo} from './chat/ChatVideo';
import {CtaScene} from './scenes/CtaScene';
import {HookScene} from './scenes/HookScene';
import {RookieScene} from './scenes/RookieScene';
import {SheetScene} from './scenes/SheetScene';
import {SolutionScene} from './scenes/SolutionScene';
import {TabsScene} from './scenes/TabsScene';

// 510 frames of scenes minus 5 swipes of 10 frames = 460 frames (15.3 s at 30 fps).
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="PovVideo" component={PovVideo} width={1080} height={1920} fps={30} durationInFrames={460} defaultProps={{topps: false}} />
    <Composition id="ChatVideo" component={ChatVideo} width={1080} height={1920} fps={30} durationInFrames={630} defaultProps={{points: 32, rebounds: 9, assists: 6, pct: 42.6, priceCents: 18400}} />
    <Folder name="Carousel">
      <Composition
        id="Slide1Hook"
        component={HookScene}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={84}
        defaultProps={{text: "POV: YOU OWN 200 NBA CARDS AND HAVE NO IDEA WHAT THEY'RE WORTH", keyword: 'NO IDEA', topps: false, photo: '', still: true}}
      />
      <Composition
        id="Slide2Tabs"
        component={TabsScene}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={72}
        defaultProps={{text: 'YOU CHECK EBAY… ONE CARD AT A TIME', keyword: 'ONE CARD AT A TIME', topps: false, still: true}}
      />
      <Composition
        id="Slide3Sheet"
        component={SheetScene}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={78}
        defaultProps={{text: 'YOUR SPREADSHEET IS FROM 2023. HALF THE PRICES ARE WRONG', keyword: 'HALF THE PRICES ARE WRONG', still: true}}
      />
      <Composition
        id="Slide4Rookie"
        component={RookieScene}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={90}
        defaultProps={{text: 'HE DROPS 32 LAST NIGHT. DID YOUR ROOKIE GO UP?', keyword: 'DID YOUR ROOKIE GO UP?', subtitle: 'no clue.', still: true}}
      />
      <Composition
        id="Slide5Solution"
        component={SolutionScene}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={96}
        defaultProps={{text: 'NOW, EVERY MORNING: WHAT LAST NIGHT DID TO YOUR CARDS', keyword: 'EVERY MORNING', screens: ['screen-recap.png', 'screen-game.png', 'screen-court.png'], still: true}}
      />
      <Composition
        id="Slide6Cta"
        component={CtaScene}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={90}
        defaultProps={{topps: false, brand: 'HoopTicker', tagline: 'FREE · LINK IN BIO', keyword: 'FREE', still: true}}
      />
    </Folder>
  </>
);
