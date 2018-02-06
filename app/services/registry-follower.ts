import * as path from 'path';
import { createReadStream as readStream, existsSync as exists } from 'fs';
import { Service, Logger, lookup } from 'denali';
import { difference } from 'lodash';
import * as follow from 'follow';
import * as npmKeyword from 'npm-keyword';
import * as fetchPackage from 'package-json';
import fetch from 'node-fetch';
import { extract } from 'tar';
import { dirSync as tmp } from 'tmp';
import { PackageMetadata } from '../types';
import CompiledVersion from '../models/compiled-version';
import RegistryChange from '../models/registry-change';
import FilesService from '../services/files';


interface Change {
  seq: number;
  id: string;
  changes: [
    { rev: string }
  ];
}

export default class RegistryFollowerService extends Service {

  registryURL = 'https://skimdb.npmjs.com/registry';
  addonKeyword = 'denali-addon';

  logger = lookup<Logger>('app:logger');
  files = lookup<FilesService>('service:files');

  constructor() {
    super();
    this.start();
  }

  async start() {
    this.logger.info('Starting registry follower');
    let lastSequence = await this.getLastSequence();
    this.logger.info(`Last sequence: ${ lastSequence }`);
    follow({ db: this.registryURL, since: lastSequence }, (error: Error, change: Change) => {
      if (error) {
        return this.logger.error(error.stack || error.message || error);
      }
      this.handleChange(change);
    });
  }

  async getLastSequence(): Promise<number | 'now'> {
    let lastSequence = await RegistryChange.getLastSequence();
    if (!lastSequence) {
      this.firstRun();
      return 'now';
    }
    return lastSequence;
  }

  async firstRun() {
    this.logger.info('This is the first run, so catching up on already published versions');
    let packageNames: string[] = await npmKeyword.names(this.addonKeyword, { size: 250 });
    for (let name of packageNames) {
      let pkg = await fetchPackage(name, { fullMetadata: true, allVersions: true });
      await this.updateAddon(pkg);
    }
  }

  async handleChange(change: Change) {
    this.logger.info(`Change reported by registry: ${ change.id } published a version`);
    let pkg = await fetchPackage(change.id, { fullMetadata: true, allVersions: true });
    if (this.isAddon(pkg)) {
      await this.updateAddon(pkg);
    }
    RegistryChange.updateLastSequence(change.seq);
  }

  isAddon(pkg: PackageMetadata) {
    return true;
    // return pkg.keywords && pkg.keywords.includes('denali-addon');
  }

  async updateAddon(pkg: PackageMetadata) {
    this.logger.info(`Updating ${pkg.name} addon versions`);
    let versions = await this.findNewVersions(pkg);
    for (let v of versions) {
      await this.uploadVersion(pkg, v);
    }
  }

  async findNewVersions(pkg: PackageMetadata) {
    let previousCompilations = await CompiledVersion.query({ name: pkg.name });
    let alreadyCompiledVersions = previousCompilations.map((c) => c.version);
    let versionsToCompile = difference(Object.keys(pkg.versions), alreadyCompiledVersions);
    return versionsToCompile;
  }

  async uploadVersion(pkg: PackageMetadata, versionSpecifier: string) {
    this.logger.info(`Building ${ pkg.name }@${ versionSpecifier }`);
    let packageDir = await this.downloadTarball(pkg, versionSpecifier);
    if (this.versionHasDocs(packageDir)) {
      await this.saveDocs(pkg, versionSpecifier, packageDir);
    }
  }

  private versionHasDocs(pkgDir: string) {
    let docsDataPath = path.join(pkgDir, 'dist', 'docs.json');
    exists(docsDataPath);
  }

  async downloadTarball(pkg: PackageMetadata, versionSpecifier: string) {
    this.logger.info(`Downloading tarball for ${ pkg.name }@${ versionSpecifier }`);
    let tmpdir = tmp({ unsafeCleanup: true }).name;
    let extractStream = extract({ cwd: tmpdir });
    let version = pkg.versions[versionSpecifier];
    let tarballURL = version.dist.tarball;
    let tarballRequest = await fetch(tarballURL);
    tarballRequest.body.pipe(extractStream);
    await new Promise((resolve) => tarballRequest.body.on('end', resolve));
    return tmpdir;
  }

  async saveDocs(pkg: PackageMetadata, version: string, dir: string): Promise<void> {
    this.logger.info(`uploading docs for ${ pkg.name }@${ version }`);
    await this.files.save('denali-docs', `${ pkg }/${ version }/docs.json`, readStream(path.join(dir, 'dist', 'docs.json')));
  }

}
