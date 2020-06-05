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
   * @type {typeof import('../src/smoke-test')}
   */
  let smokeTest;
  assert.doesNotThrow(() => {
    smokeTest = require(pkg.name);
  }, `could not require('${pkg.name}')`);

  ok(typeof smokeTest.smoke === 'function', 'did not export "smoke" function');

  assert.doesNotReject(import(pkg.name), `could not import('${pkg.name}')`);

  assert.doesNotThrow(() => {
    require(`${pkg.name}/${pkg.main}`);
  }, `could not require('${pkg.name}/${pkg.main}') directly`);
};
