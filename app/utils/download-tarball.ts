import { dirSync as tmp } from 'tmp';
import { extract } from 'tar';
import fetch from 'node-fetch';
import { lookup, Logger } from '@denali-js/core';

const logger = lookup<Logger>('app:logger');

export default async function downloadTarball(url: string) {
  logger.info(`Downloading tarball from ${ url }`);
  let tmpdir = tmp({ unsafeCleanup: true }).name;
  let extractStream = extract({ cwd: tmpdir });
  let tarballRequest = await fetch(url);
  tarballRequest.body.pipe(extractStream);
  await new Promise((resolve) => tarballRequest.body.on('end', resolve));
  return tmpdir;
}
