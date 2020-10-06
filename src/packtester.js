'use strict';

const cpy = require('cpy');
const path = require('path');
const globby = require('globby');
const execa = require('execa');
const which = require('which');
const tmp = require('tmp-promise');
const readPkgUp = require('read-pkg-up');
const consola = require('consola');
const StackUtils = require('stack-utils');

const DEFAULT_TEST_DIR = '__pack_tests__';

async function pack({npmPath, cwd, tmpDirPath}) {
  let tarballPath;
  try {
    tarballPath = (
      await execa(npmPath, ['pack', cwd], {
        cwd: tmpDirPath
      })
    ).stdout;
    // @ts-ignore
    consola.success('packed tarball %s', tarballPath);
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
    // @ts-ignore
    consola.success('successfully installed via tarball %s', tarballPath);
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
    // @ts-ignore
    consola.info('found npm at %s', npmPath);
  } catch (err) {
    throw new Error(`could not find npm executable: ${err.message}`);
  }
  return npmPath;
}

async function readPackage(cwd) {
  const pkgResult = await readPkgUp({normalize: false, cwd});
  const pkg = pkgResult.packageJson;
  cwd = path.dirname(pkgResult.path);
  // @ts-ignore
  consola.info('found package.json at %s', pkgResult.path);
  return {pkg, cwd};
}

async function findTargets({cwd, target, tmpDirPath}) {
  const targets = new Map(
    (await globby(target)).map(testFile => [
      path.resolve(cwd, testFile),
      path.resolve(tmpDirPath, testFile)
    ])
  );
  if (!targets.size) {
    throw new Error(`could not find any test files in ${target}`);
  }
  // @ts-ignore
  consola.debug('computed targets %O', targets);
  return targets;
}

/**
 * Runs a test as a script current `node`
 * @param {string} target - File to run
 * @param {import('execa').NodeOptions} opts - Options for `execa`
 */
async function runTarget(target, opts = {}) {
  return execa.node(target, opts);
}

/**
 * Runs a pack test to ensure that your package, as packed, will be consumable.
 * @param {Partial<PackTestConfig>} opts - Configuration
 * @returns {Promise<void>}
 */
exports.packTest = async (opts = {}) => {
  let {
    cwd = process.cwd(),
    pkg = null,
    target = null,
    npmPath = '',
    logLevel = consola.LogLevel.Silent
  } = opts;

  // @ts-ignore
  consola.level = logLevel;

  // @ts-ignore
  consola.info('packtester starting - https://npm.im/packtester');

  if (!pkg) {
    const pkgResult = await readPackage(cwd);
    cwd = pkgResult.cwd;
    pkg = pkgResult.pkg;
  }

  if (!npmPath) {
    npmPath = await whichNpm();
  }

  if (!target) {
    target = path.relative(cwd, DEFAULT_TEST_DIR);
  }
  try {
    await tmp.withDir(
      async ({path: tmpDirPath}) => {
        // @ts-ignore
        consola.success('created temp dir %s', tmpDirPath);
        // @ts-ignore
        consola.debug('looking for targets in %s', target);
        const targets = await findTargets({cwd, tmpDirPath, target});
        const tarballPath = await pack({npmPath, cwd, tmpDirPath});
        // @ts-ignore
        consola.debug('installing from tarball...');
        await installFromTarball({
          tarballPath,
          npmPath,
          tmpDirPath
        });
        // @ts-ignore
        consola.success('installed %s from tarball', pkg.name);

        await Promise.all(
          Array.from(targets).map(async ([src, dest]) => {
            await cpy(src, path.dirname(dest));
            // @ts-ignore
            consola.debug('copied %s to %s; running', src, dest);
            try {
              await runTarget(dest);
            } catch (err) {
              // err.packtesterTarget = path.relative(cwd, src);
              // @ts-ignore
              consola.debug(err);
              throw err;
            }
            // @ts-ignore
            consola.success('test %s ok', src);
          })
        );
        // @ts-ignore
        consola.success('all tests passed');
      },
      {unsafeCleanup: true, prefix: 'packtester'}
    );
  } catch (err) {
    const stack = new StackUtils({
      cwd: process.cwd(),
      internals: StackUtils.nodeInternals(),
      ignoredPackages: ['packtester', 'execa']
    });
    const cleanStack = stack.clean(err.stack);

    process.exitCode = 1;
    if (err.packtesterTarget) {
      // @ts-ignore
      consola.error('test %s failed!\n\n%s', err.packtesterTarget, cleanStack);
    } else {
      throw err;
    }
  }
};

/**
 * Main config object for `packtester`.
 * @typedef {Object} PackTestConfig
 * @property {string|string[]} target - Pack test target(s)
 * @property {string} [cwd] - Current working directory
 * @property {import('type-fest').PackageJson} [pkg] - Parsed `package.json`
 * @property {string} [npmPath] - Path to `npm` executable
 * @property {number} [logLevel] - Log level (per `consola`)
 */

/**
 * A (optionally user-defined) function, given some configuration, attempts to
 * test a package which was installed as a user would.
 * @callback PackTestFunction
 * @param {Partial<PackTestConfig>} config - Configuration for the test
 * function
 * @returns {Promise<void>|void}
 */
