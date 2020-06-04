'use strict';

const cpy = require('cpy');
const path = require('path');
const globby = require('globby');
const execa = require('execa');
const which = require('which');
const tmp = require('tmp-promise');
const debug = require('debug')('smoke-test');
const readPkgUp = require('read-pkg-up');

const DEFAULT_SMOKE_TEST_DIR = '__smoke_tests__';

async function pack({npmPath, cwd, tmpDirPath}) {
  let tarballPath;
  try {
    tarballPath = (
      await execa(npmPath, ['pack', cwd], {
        cwd: tmpDirPath
      })
    ).stdout;
    debug('successfully packed into tarball %s', tarballPath);
  } catch (err) {
    throw new Error(`could not pack project at ${cwd}: ${err}`);
  }
  return tarballPath;
}

async function installFromTarball({npmPath, tarballPath, tmpDirPath}) {
  try {
    await execa(npmPath, ['install', tarballPath], {
      cwd: tmpDirPath
    });
    debug('successfully installed via tarball %s', tarballPath);
  } catch (err) {
    throw new Error(
      `could not "npm install" from tarball ${tarballPath}: ${err.message}`
    );
  }
}

async function whichNpm() {
  let npmPath;
  try {
    npmPath = await which('npm');
    debug('found npm at %s', npmPath);
  } catch (err) {
    throw new Error(`could not find npm executable: ${err.message}`);
  }
  return npmPath;
}

async function readPackage(cwd) {
  const pkgResult = await readPkgUp({normalize: false, cwd});
  const pkg = pkgResult.packageJson;
  cwd = path.dirname(pkgResult.path);
  return {pkg, cwd};
}

async function findTargets({cwd, target, tmpDirPath}) {
  const targets = (await globby(target)).map(testFile => [
    path.resolve(cwd, testFile),
    path.resolve(tmpDirPath, testFile)
  ]);
  if (!targets.length) {
    throw new Error(`could not find any test files in ${target}`);
  }
  debug('computed targets %O', targets);
  return targets;
}

function createTargetRunner(pkg) {
  return async function(target) {
    let testFunc;
    try {
      testFunc = require(target);
      debug('loaded %s via require()', target);
    } catch (err) {
      debug('could not require() %s:', target, err);
      try {
        testFunc = await import(target);
        debug('loaded %s via import()', target);
      } catch (err) {
        throw new Error(
          `could neither require() nor import() ${target}: ${err}`
        );
      }
    }
    if (typeof testFunc === 'function') {
      await testFunc(pkg);
      debug('executed test script at %s successfully', target);
    } else {
      throw new Error(
        `test script must have a test function as its default export; found ${typeof testFunc}`
      );
    }
  };
}

/**
 * Runs a smoke test to ensure that your package, as packed, will be consumable.
 * @param {Partial<SmokeTestConfig>} opts - Configuration
 * @returns {Promise<void>}
 */
exports.smoke = async (opts = {}) => {
  let {cwd = process.cwd(), pkg = null, target = null, npmPath = ''} = opts;

  if (!pkg) {
    const pkgResult = await readPackage(cwd);
    cwd = pkgResult.cwd;
    pkg = pkgResult.pkg;
  }

  const runTarget = createTargetRunner(pkg);

  if (!npmPath) {
    npmPath = await whichNpm();
  }

  if (!target) {
    target = path.relative(cwd, DEFAULT_SMOKE_TEST_DIR);
  }

  try {
    await tmp.withDir(
      async ({path: tmpDirPath}) => {
        debug(
          'created tmp dir at %s; looking for targets in %s',
          tmpDirPath,
          target
        );
        const targets = await findTargets({cwd, tmpDirPath, target});
        const tarballPath = await pack({npmPath, cwd, tmpDirPath});
        debug('installing from tarball...');
        await installFromTarball({
          tarballPath,
          npmPath,
          tmpDirPath
        });

        for await (const [src, dest] of targets) {
          await cpy(src, path.dirname(dest));
          debug('copied %s to %s; running', src, dest);
          await runTarget(dest);
        }
      },
      {unsafeCleanup: true}
    );
  } catch (err) {
    process.exitCode = 1;
    throw err;
  }
  console.error('ok');
};

/**
 * Main config object for `smoke-test`.
 * @typedef {Object} SmokeTestConfig
 * @property {string|string[]} target - Smoke test target(s)
 * @property {string} [cwd] - Current working directory
 * @property {import('type-fest').PackageJson} [pkg] - Parsed `package.json`
 * @property {string} [npmPath] - Path to `npm` executable
 */

/**
 * A (optionally user-defined) function, given some configuration, attempts to
 * test a package which was installed as a user would.
 * @callback SmokeTestFunction
 * @param {Partial<SmokeTestConfig>} config - Configuration for the test
 * function
 * @returns {Promise<void>|void}
 */
