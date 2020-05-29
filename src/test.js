'use strict';

const path = require('path');

/**
 * The default "test" function.  Tries to do something reasonable, which is:
 *
 * - Depending on value of `cjs`, will `require()` the package installed via tarball
 * - Depending on value of `esm`, will `import()` the package installed via tarball
 * - For each explicit `SmokeTestPathConfig` in `paths`, will attempt the same
 *   - Uses explicit `esm`/`cjs` props of each `SmokeTestPathConfig` if present; defaulting to `true` for both
 *   - Otherwise, if `SmokeTestPathConfig` is a string, look at the extension and guess what to do
 * @type {import('./index').SmokeTestFunction}
 */
module.exports = async function test({
  cjs = true,
  esm = true,
  paths = [],
  pkg
} = {}) {
  const packageName = pkg.name;

  /**
   * @param {string} filepath
   */
  async function tryRequire(filepath) {
    process.stderr.write(`trying to require('${filepath}')...`);
    try {
      require(filepath);
      process.stderr.write('ok\n');
    } catch (err) {
      throw new Error(`could not require('${filepath}'): ${err}`);
    }
  }

  /**
   * @param {string} filepath
   */
  async function tryImport(filepath) {
    process.stderr.write(`trying to import('${filepath}')...`);
    try {
      await import(filepath);
      process.stderr.write('ok\n');
    } catch (err) {
      throw new Error(`could not import('${filepath}'): ${err}`);
    }
  }

  if (cjs) {
    await tryRequire(packageName);
  }
  if (esm) {
    await tryImport(packageName);
  }

  for await (let filepath of paths) {
    if (typeof filepath === 'string') {
      filepath = path.isAbsolute(filepath)
        ? path.relative(require.resolve(packageName), filepath)
        : path.join(packageName, filepath);
      const ext = path.extname(filepath);
      if (ext === '.mjs') {
        console.error(`skipping require('${filepath}') due to .mjs extension`);
      } else {
        await tryRequire(filepath);
      }
      if (ext === '.mjs' || ext === '.js') {
        await tryImport(filepath);
      } else {
        console.error(
          `skipping import('${filepath}') due to unsupported extension`
        );
      }
    } else if (typeof filepath === 'object') {
      const fileObject = filepath;
      filepath = path.isAbsolute(fileObject.path)
        ? path.relative(require.resolve(packageName), fileObject.path)
        : path.join(packageName, fileObject.path);
      if (fileObject.cjs !== false) {
        await tryRequire(filepath);
      }
      if (fileObject.esm !== false) {
        await tryImport(filepath);
      }
    }
  }
};
