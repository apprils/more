import { deepUnref } from "vue-deepunref";

import type { Config } from "./@types";

export const config: Config = {
  unref: deepUnref,
  responseMode: "json",
};

export default config;
