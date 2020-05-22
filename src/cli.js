#!/usr/bin/env node

'use strict';

const {smoke, getPackage} = require('./index');

process.on('unhandledRejection', err => {
  throw err;
});

(async function() {
  // TODO error handling here
  const {packageJson: pkg} = await getPackage();

  // TODO error handling here
  const cfg = pkg['smoke-test'];
  const opts = {pkg};
  if (cfg) {
    opts.cjs = Boolean(cfg.cjs);
    opts.esm = Boolean(cfg.esm);
    opts.script = String(cfg.script);
  }
  await smoke(opts);
})();
