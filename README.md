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

> TODO: via `init` command; needs implementation

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

Create a `__pack_tests__` directory. All files (with `.js`, `.cjs`, and `.mjs` extensions, by default) in this directory will be run with _your module_ installed as a dependency. Here's an example file:

```js
// packtester.packtest.js

const assert = require('assert');
// remember, use your package like a consumer would
const pkg = require('packtester/package.json'); // yeah yeah I know

let packtester;
assert.doesNotThrow(() => {
  packtester = require(pkg.name);
}, `could not require('${pkg.name}')`);

// packtester exports a function, `packTest`
assert.ok(
  typeof packtester.packTest === 'function',
  'did not export "packTest" function'
);

// ESM!
assert.doesNotReject(import(pkg.name), `could not import('${pkg.name}')`);

assert.doesNotThrow(() => {
  require(`${pkg.name}/${pkg.main}`);
}, `could not require('${pkg.name}/${pkg.main}') directly`);
```

**You do not need to add test files for `packtester` to your published package** (unless you want to); in other words, they don't need to be in the `files` prop of `package.json`, and they can be safely ignored via `.npmignore`, if desired.

## Options

### Custom Targets

By supplying positional arguments to `packtester`, you can point it at any directory, file, or glob. Example:

```json
{
  "scripts": {
    "pretest": "packtester \"my-smoke-tests/**/*.js\"",
    "test": "my-regular-test-script"
  }
}
```

### Custom `package.json`

`packtester` needs the `package.json` of your package to run. Use the `--package <package.json>` command-line option to use a specific `package.json` file. This may be useful in a monorepo or workspace. Example:

```json
{
  "scripts": {
    "pretest": "packtester --package=./packages/subpackage/package.json",
    "test": "my-regular-test-script"
  }
}
```

### More Help

Run `npx packtester --help` to see more usage options.

## API

`packtester` exports a single property, `packTest`, which is an `async` function.

### `packtester.packTest([opts]): Promise<void>`

Does everything the `packtester` CLI does.

`opts` is an options object and supports properties (all optional):

- `{string|string[]}` `target` - One or more target files, dirs, globs. Defaults to `__pack_tests__`
- `{string}` `cwd` - Current working directory
- `{PackageJson}` `pkg` - A parsed `package.json`
- `{string}` `npmPath` - Path to `npm` executable
- `{number}` `logLevel` - Log level, 0-5, with 0 being "error" and 5 being "trace"

## About Tests

The purpose of these tests is to make assertions about the state of your package's public API. The question you're trying to answer is this: _is my package usable when installed via a package manager?_

Remember: you won't have your `devDependencies` installed; this means no test frameworks, assertion libraries, etc. The built-in [assert](https://nodejs.org/api/assert.html) module works well for this use case.

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
