import * as path from 'path';
import { createReadStream as readStream, existsSync as exists } from 'fs';
import { Service, Logger, lookup, ConfigService } from 'denali';
import { omit } from 'lodash';
import follow from 'follow';
import npmKeyword from 'npm-keyword';
import fetchPackage from 'package-json';
import fetch from 'node-fetch';
import { extract } from 'tar';
import { dirSync as tmp } from 'tmp';
import { PackageMetadata, VersionMetadata, Dict } from '../types';
import RegistryChange from '../models/registry-change';
import Addon from '../models/addon';
import FilesService from '../services/files';
import Version from '../models/version';


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
  config = lookup<ConfigService>('service:config');

  async start() {
    this.logger.info('Starting registry follower');
    let lastSequence = await this.getLastSequence();
    this.logger.info(`Last sequence: ${ lastSequence }`);
    this.startFollower(lastSequence);
  }

  private startFollower(lastSequence: string | number) {
    follow({ db: this.registryURL, since: lastSequence }, (error: Error, change: Change) => {
      if (error) {
        return this.logger.error(error.stack || error.message || error);
      }
      this.handleChange(change);
    });
  }

  private async getLastSequence(): Promise<number | 'now'> {
    let lastSequence = await RegistryChange.getLastSequence();
    if (!lastSequence) {
      this.firstRun();
      return 'now';
    }
    this.logger.info(`Resuming registry stream from seq ${ lastSequence }`);
    return lastSequence;
  }

  private async firstRun() {
    this.logger.info('This is the first run, so catching up on already published versions');
    let packageNames: string[] = await npmKeyword.names(this.addonKeyword, { size: 250 });
    for (let name of packageNames) {
      let pkg = await fetchPackage(name, { fullMetadata: true, allVersions: true });
      await this.updateAddon(pkg);
    }
  }

  private async handleChange(change: Change) {
    this.logger.info(`Change reported by registry: ${ change.id } published a version`);
    let pkg = await fetchPackage(change.id, { fullMetadata: true, allVersions: true });
    if (this.isAddon(pkg)) {
      await this.updateAddon(pkg);
    }
    RegistryChange.updateLastSequence(change.seq);
  }

  private isAddon(pkg: PackageMetadata) {
    let version = <string>Object.keys(pkg.versions).pop();
    let versionPkg = pkg.versions[version];
    return versionPkg.keywords && versionPkg.keywords.includes('denali-addon');
  }

  private async updateAddon(pkg: PackageMetadata) {
    this.logger.info(`Updating versions for addon: "${pkg.name}"`);
    let addon = await this.findOrCreateAddon(pkg);
    let newVersionMetadatas = await this.filterOutExistingVersions(addon, pkg.versions);
    for (let versionName in newVersionMetadatas) {
      let versionMetadata = newVersionMetadatas[versionName];
      this.logger.info(`Found a new published version for "${ addon.name }": ${ versionMetadata.version }`);
      let newVersion = await Version.createFromVersionMetadata(addon, versionMetadata);
      await this.uploadVersion(addon, newVersion);
    }
  }

  private async findOrCreateAddon(pkg: PackageMetadata) {
    let addonName = pkg.name;
    let addon = <Addon>await Addon.find(addonName);
    if (addon === null) {
      this.logger.info(`Found a new addon: "${ pkg.name }`);
      addon = await Addon.createFromPackageMetadata(pkg);
    }
    return addon;
  }

  private async filterOutExistingVersions(addon: Addon, versionMetadatas: Dict<VersionMetadata>) {
    let existingVersionRecords = await addon.getVersions({ is_branch: false });
    let existingVersions = existingVersionRecords.map((version) => version.version);
    return omit(versionMetadatas, existingVersions);
  }

  private async uploadVersion(addon: Addon, version: Version) {
    let dir = await this.downloadTarball(addon, version);
    if (this.hasDocs(dir)) {
      this.logger.info(`${ addon.name }@${ version.version } has docs, uploading`);
      await this.saveDocs(addon, version, dir);
    } else {
      this.logger.info(`${ addon.name }@${ version.version } has no docs, skipping`);
    }
  }

  private hasDocs(extractedTarballDir: string) {
    let docsDataPath = path.join(extractedTarballDir, 'dist', 'docs.json');
    exists(docsDataPath);
  }

  private async downloadTarball(addon: Addon, version: Version) {
    this.logger.info(`Downloading tarball for ${ addon.name }@${ version.version }`);
    let tmpdir = tmp({ unsafeCleanup: true }).name;
    let extractStream = extract({ cwd: tmpdir });
    let tarballRequest = await fetch(version.tarballUrl);
    tarballRequest.body.pipe(extractStream);
    await new Promise((resolve) => tarballRequest.body.on('end', resolve));
    return tmpdir;
  }

  private async saveDocs(addon: Addon, version: Version, dir: string): Promise<void> {
    this.logger.info(`Uploading docs for ${ addon.name }@${ version.version }`);
    await this.files.save('denali-docs', `${ addon.name }/release-${ version.version }/docs.json`, readStream(path.join(dir, 'dist', 'docs.json')));
  }

}
