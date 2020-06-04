#!/usr/bin/env node

'use strict';

const path = require('path');
const {smoke} = require('./smoke-test');
const yargs = require('yargs');

process.on('unhandledRejection', err => {
  throw err;
});

yargs
  .command(
    '$0',
    'Run smoke tests',
    yargs => {
      yargs
        .strict()
        .positional('target', {
          describe: 'Location of smoke test target(s)',
          defaultDescription: '__smoke_test__'
        })
        .options({
          package: {
            alias: 'p',
            describe: 'Path to package.json',
            defaultDescription: '(closest parent package.json)',
            coerce: v => (v.endsWith('package.json') ? path.dirname(v) : v),
            normalize: true,
            type: 'string',
            requiresArg: true,
            default: process.cwd()
          }
        });
    },
    async argv => smoke({cwd: argv.package})
  )
  .command(
    'init',
    'Initialize a project with smoke-test defaults',
    () => {},
    argv => {
      console.log('init!');
    }
  )
  .help()
  .version()
  .parse();
