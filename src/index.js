'use strict';

const execa = require('execa');
const which = require('which');
const tmp = require('tmp-promise');
const debug = require('debug')('smoke-test');
const readPkgUp = require('read-pkg-up');

async function test({cjs = true, esm = true, pkg} = {}) {
  const packageName = pkg.name;
  if (cjs) {
    try {
      require(packageName);
    } catch (err) {
      throw new Error(`could not require('${packageName}'): ${err.message}`);
    }
  }
  if (esm) {
    try {
      await import(packageName);
    } catch (err) {
      throw new Error(`could not import('${packageName}'): ${err.message}`);
    }
  }
}

async function pack({npmpath, cwd, tmpdirpath}) {
  let npmOutput;
  try {
    npmOutput = await execa(npmpath, ['--json', 'pack', cwd], {
      cwd: tmpdirpath
    });
    debug('successfully packed project at %s', cwd);
  } catch (err) {
    throw new Error(`could not pack project at ${cwd}: ${err.message}`);
  }
  return npmOutput;
}

function parsePackOutput(npmOutput) {
  let packInfo;
  try {
    packInfo = JSON.parse(npmOutput.stdout);
    debug('parsed output of npm pack');
  } catch (err) {
    throw new Error(
      `could not parse result of ${npmOutput.command}: ${err.message}`
    );
  }
  let tarballpath;
  try {
    tarballpath = packInfo[0].filename;
    debug('found tarball filename %s', tarballpath);
  } catch (err) {
    throw new Error(
      `could not find tarball filename in JSON result: ${npmOutput.stdout}`
    );
  }
  return tarballpath;
}

async function installFromTarball({npmpath, tarballpath, tmpdirpath}) {
  try {
    await execa(npmpath, ['install', tarballpath], {
      cwd: tmpdirpath
    });
    debug('successfully installed via tarball %s', tarballpath);
  } catch (err) {
    throw new Error(
      `could not "npm install" from tarball ${tarballpath}: ${err.message}`
    );
  }
}

async function getPackage({cwd = process.cwd()} = {}) {
  return readPkgUp({normalize: false, cwd});
}

async function smoke({
  cwd = process.cwd(),
  cjs = true,
  esm = true,
  script = '',
  pkg = {}
} = {}) {
  let npmpath;
  try {
    npmpath = await which('npm');
    debug('found npm at %s', npmpath);
  } catch (err) {
    throw new Error(`could not find npm executable: ${err.message}`);
  }

  try {
    await tmp.withDir(
      async ({path: tmpdirpath}) => {
        debug('created npm dir at %s', tmpdirpath);

        const npmOutput = await pack({npmpath, cwd, tmpdirpath});
        const {tarballpath} = parsePackOutput(npmOutput);
        installFromTarball({tarballpath, npmpath, tmpdirpath});

        if (script) {
          const scriptFunc = await import(script);
          await scriptFunc({cjs, esm, pkg});
        } else {
          await test({cjs, esm, pkg});
        }
      },
      {unsafeCleanup: true}
    );
  } catch (err) {
    process.exitCode = 1;
    throw err;
  }
  console.error('OK!');
}

exports.smoke = smoke;
exports.getPackage = getPackage;
