import { existsSync } from 'node:fs';
import { Config } from '@remotion/cli/config';

// Renders run locally (never on Netlify). On macOS the installed Chrome is more reliable than
// the downloaded headless shell; REMOTION_BROWSER overrides it.
const chrome =
  process.env.REMOTION_BROWSER ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (existsSync(chrome)) Config.setBrowserExecutable(chrome);
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
