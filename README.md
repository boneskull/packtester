# smoke-test

> Test your package as it would be installed by a consumer

## Why?

Running your regular test suite (e.g., `npm test`) in CI _will_ miss packaging-related issues, such as missing files and package exports.

There's no staging registry you can test with, so when something's published, it's published. If there's a problem with it, you have to issue a patch and publish again. We can't avoid the problem entirely, but `smoke-test` gets closer.

This is kind of a pain to do manually, so automating it might be nice, right?

## Install

```shell
$ npm install smoke-test --save-dev
```

You'll then want to add a `pretest` script to your `scripts` field in `package.json`:

```json
{
  "scripts": {
    "pretest": "smoke",
    "test": "my-regular-test-script"
  }
}
```

It's recommended to _also_ run `smoke` during `prepublishOnly`, so it will check at the last minute before you publish.

## Usage

### Default Behavior

By default, `smoke-test` will:

1. Create a tarball
1. Un-tar the tarball into a temp directory
1. Attempt to `require()` or `import()` your package from the tarball (and/or all of its subpath exports)
1. If this fails, then returns with a nonzero exit code

The third step is configurable.

### Configuration

Add a `smoke-test` property to `package.json`. These are the defaults:

```json
{
  "smoke-test": {
    "cjs": true,
    "esm": true
  }
}
```

- `cjs`: Ensure a consumer can `require()` your package.
- `esm`: Ensure a consumer can `import()` or `import` your package.
- `script`: A path to a custom test script.

#### Custom Test Script

If you want to get fancy, add a custom test script. You might want to test some basic functionality, or check for the existence of specific files. Example:

```js
// CJS style
module.exports = async function test({cjs, esm, pkg}) {
  // do your test here; reject if failure
};
```

or:

```js
// ESM style
export default function({cjs, esm, pkg}) {
  // do your test here; reject if failure
}
```

`pkg` will be the parsed `package.json` of your project, which you can inspect for whatever reason.

## TODO (help wanted!)

- Needs to check subpath exports
- Support for Yarn/pnpm/etc.
- Example for use w/ GitHub Actions (or just a publish a standalone GitHub action)
- Examples for use with Travis-CI, Circle CI, other popular CI services
- CLI options? More/better CLI output?

## License

Copyright © 2020 Christopher Hiller. Licensed Apache-2.0
