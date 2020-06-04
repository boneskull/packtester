# smoke-test

> Test your package as it would be installed by a consumer

## Motivation

Running your regular test suite (e.g., `npm test`) in CI _will_ miss packaging-related issues, such as missing files and package exports.

There's no staging registry you can test with, so when something's published, it's published. If there's a problem with it, you have to issue a patch and publish again. We can't avoid the problem entirely, but `smoke-test` gets closer.

This is kind of a pain to do manually, so automating it might be nice, right?

## Install

```shell
$ npm install smoke-test --save-dev
```

### Setup (Automatic)

> TODO: via `init` command

### Setup (Manual)

Add a `pretest` script to your `scripts` field in `package.json`:

```json
{
  "scripts": {
    "pretest": "smoke-test",
    "test": "my-regular-test-script"
  }
}
```

> It's recommended to _also_ run `smoke-test` during `prepublishOnly`, so it will check at the last minute before you publish.

Create a `__smoke_test__` directory; all files in this directory will be run as smoke tests. Read about [creating smoke tests](#creating-smoke-tests).

**You do not need to add test files for `smoke-test` to your package**; in other words, they don't need to be in the `files` prop of `package.json`, and they can be safely ignored via `.npmignore`, if desired.

## Configuration (Optional)

> TODO: implement this

If you want to provide a location other than `__smoke_test__`, supply files, globs, or dirs ("targets") as arguments to the `smoke-test` executable:

```bash
smoke-test "test/**/*.smoke.js" something-else.smoke.js
```

You can also configure `smoke-test` via `package.json`, by adding a `smoke-test` prop with a `targets` prop:

```json
{
  "smoke-test": {
    "targets": ["file.js", "dir/", "globs/**/*.js"]
  }
}
```

Targets supplied as command-line arguments will be merged with any files in the above configuration.

## Creating Smoke Test Files

A _smoke test file_ is just a plain Node.js module, which has a default export of a function. This function will be called with a single parameter: the contents of your `package.json`.

The purpose of this test file is to make assertions about the state of your package's public API. The question you're trying to answer is this: _is my package usable when installed via a package manager?_

Remember: you won't have your `devDependencies` installed; this means no test frameworks, assertion libraries, etc. The built-in [assert](https://nodejs.org/api/assert.html) module works well for this use case.

### CJS Example

This example is a smoke test file used by `smoke-test` itself.

```js
const assert = require('assert');

module.exports = async pkg => {
  let smokeTest;
  assert.doesNotThrow(() => {
    smokeTest = require(pkg.name);
  }, `could not require('${pkg.name}')`);

  assert.ok(
    typeof smokeTest.smoke === 'function',
    'did not export "smoke" function'
  );

  assert.doesNotReject(import(pkg.name), `could not import('${pkg.name}')`);

  assert.doesNotThrow(() => {
    require(`${pkg.name}/${pkg.main}`);
  }, `could not require('${pkg.name}/${pkg.main}') directly`);
};
```

### ESM Example

> TODO

## License

Copyright © 2020 Christopher Hiller. Licensed Apache-2.0
