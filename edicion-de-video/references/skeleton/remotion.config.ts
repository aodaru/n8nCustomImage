import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// consistent backdrop-filter / mixBlendMode across machines
Config.setChromiumOpenGlRenderer("angle");
