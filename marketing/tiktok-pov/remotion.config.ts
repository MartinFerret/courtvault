/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// The downloaded chrome-headless-shell crashes on this Mac (icudtl.dat lookup): use the
// installed Google Chrome for renders.
Config.setBrowserExecutable('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
