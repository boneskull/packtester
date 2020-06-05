const assert = require('assert');

/**
 * @type {typeof assert.ok}
 */
const ok = assert.ok;

/**
 * @param {import('type-fest').PackageJson} pkg
 */
module.exports = async pkg => {
  /**
   * @type {typeof import('../src/packtester')}
   */
  let packtester;
  assert.doesNotThrow(() => {
    packtester = require(pkg.name);
  }, `could not require('${pkg.name}')`);

  ok(
    typeof packtester.packTest === 'function',
    'did not export "packTest" function'
  );

  assert.doesNotReject(import(pkg.name), `could not import('${pkg.name}')`);

  assert.doesNotThrow(() => {
    require(`${pkg.name}/${pkg.main}`);
  }, `could not require('${pkg.name}/${pkg.main}') directly`);
};
