# packtester

> Test the output of your npm-published package

## Motivation

Running your regular test suite (e.g., `npm test`) in CI _will_ miss packaging-related issues, such as missing files and package exports.

There's no staging registry you can test with, so when something's published, it's published. If there's a problem with it, you have to issue a patch and publish again. We can't avoid the problem entirely, but `packtester` gets closer.

This is kind of a pain to do manually, so automating it might be nice, right?

## Install

```shell
$ npm install packtester --save-dev
```

### Setup (Automatic)

> TODO: via `init` command

### Setup (Manual)

Add a `pretest` script to your `scripts` field in `package.json`:

```json
{
  "scripts": {
    "pretest": "packtester",
    "test": "my-regular-test-script"
  }
}
```

> It's recommended to _also_ run `packtester` during `prepublishOnly`, so it will check at the last minute before you publish.

Create a `__pack_tests__` directory; all files in this directory will be run as "pack" tests. Read about [creating pack tests](#creating-pack-tests).

**You do not need to add test files for `packtester` to your package**; in other words, they don't need to be in the `files` prop of `package.json`, and they can be safely ignored via `.npmignore`, if desired.

<!--
## Configuration (Optional)

> TODO: implement this

If you want to provide a location other than `__pack_tests__`, supply files, globs, or dirs ("targets") as arguments to the `packtester` executable:

```bash
packtester "test/**/*.js" something-else.packtest.js
```

You can also configure `packtester` via `package.json`, by adding a `packtester` prop with a `targets` prop:

```json
{
  "packtester": {
    "targets": ["file.js", "dir/", "globs/**/*.js"]
  }
}
```

Targets supplied as command-line arguments will be merged with any files in the above configuration. -->

## Creating Pack Tests

A _pack test_ is just a plain Node.js module, which has a default export of a function. This function will be called with a single parameter: the contents of your `package.json`.

The purpose of this test file is to make assertions about the state of your package's public API. The question you're trying to answer is this: _is my package usable when installed via a package manager?_

Remember: you won't have your `devDependencies` installed; this means no test frameworks, assertion libraries, etc. The built-in [assert](https://nodejs.org/api/assert.html) module works well for this use case.

### CJS Example

This example is a pack test file used by `packtester` itself.

```js
const assert = require('assert');

module.exports = async pkg => {
  let packtester;
  assert.doesNotThrow(() => {
    packtester = require(pkg.name);
  }, `could not require('${pkg.name}')`);

  assert.ok(
    typeof packtester.packTest === 'function',
    'did not export "packTest" function'
  );

  assert.doesNotReject(import(pkg.name), `could not import('${pkg.name}')`);

  assert.doesNotThrow(() => {
    require(`${pkg.name}/${pkg.main}`);
  }, `could not require('${pkg.name}/${pkg.main}') directly`);
};
```

### ESM Example

> TODO

## How It Works

`packtester`:

1. Runs `npm pack` on your project to generate a tarball in a temporary directory
1. Runs `npm install` against the tarball in the temp dir
1. Copies the target tests into temp dir
1. Runs the target tests, exiting with non-zero code if they fail
1. Removes the temp dir

By installing from a tarball created from `npm pack`, we simulate what would happen if you installed your project via a package manager, e.g., `npm install my-package`.

## License

Copyright © 2020 Christopher Hiller. Licensed Apache-2.0
