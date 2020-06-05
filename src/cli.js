#!/usr/bin/env node

'use strict';

const pkg = require('../package.json');
const path = require('path');
const {smoke} = require('./smoke-test');
const yargs = require('yargs');
const {LogLevel} = require('consola');

process.on('unhandledRejection', err => {
  throw err;
});

yargs
  .scriptName(pkg.name)
  .command(
    '$0',
    pkg.description,
    yargs => {
      yargs
        .strict()
        .positional('target', {
          describe: 'Location of smoke test target(s); files, dirs or globs',
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
            default: process.cwd(),
            group: 'Behavior:'
          }
        })
        .epilogue(
          `GitHub: https://github.com/boneskull/smoke-test
   npm: https://npm.im/smoke-test
`
        );
    },
    async argv =>
      smoke({cwd: argv.package, logLevel: argv.logLevel, target: argv.target})
  )
  .options({
    verbose: {
      alias: 'v',
      describe: 'Verbose output',
      type: 'boolean',
      conflicts: 'quiet'
    },
    quiet: {
      describe: 'Suppress output',
      type: 'boolean',
      conflicts: 'verbose'
    }
  })
  .middleware(argv => {
    if (argv.quiet) {
      argv.logLevel = LogLevel.Error;
    } else if (argv.verbose) {
      argv.logLevel = LogLevel.Debug;
    } else {
      argv.logLevel = LogLevel.Info;
    }
  })
  // .command(
  //   'init',
  //   'Initialize a project with smoke-test defaults',
  //   () => {},
  //   argv => {
  //     console.log('init!');
  //   }
  // )
  .alias('h', 'help')
  .version()

  .parse();
