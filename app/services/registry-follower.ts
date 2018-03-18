import * as path from 'path';
import { createReadStream as readStream, existsSync as exists } from 'fs';
import { Service, lookup, ConfigService } from '@denali-js/core';
import { omit } from 'lodash';
import follow from 'follow';
import npmKeyword from 'npm-keyword';
import fetchPackage from 'package-json';
import { PackageMetadata, VersionMetadata, Dict } from '../types';
import RegistryChange from '../models/registry-change';
import Addon from '../models/addon';
import FilesService from '../services/files';
import Version from '../models/version';
import downloadTarball from '../utils/download-tarball';
import VersionAlias from '../models/version-alias';
import ApplicationLogger from '../logger';


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

  logger = lookup<ApplicationLogger>('app:logger').scope('registry-follow');
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
    if (!pkg.versions) {
      return false;
    }
    let version = <string>Object.keys(pkg.versions).pop();
    let versionPkg = pkg.versions[version];
    return versionPkg.keywords && versionPkg.keywords.includes('denali-addon');
  }

  private async updateAddon(pkg: PackageMetadata) {
    this.logger.info(`Updating "${pkg.name}" addon after registry change`);
    let addon = await this.findOrCreateAddon(pkg);
    await this.updateVersions(addon, pkg);
    await this.updateVersionAliases(addon, pkg);
    await addon.updateLatestAlias();

  }

  private async updateVersions(addon: Addon, pkg: PackageMetadata) {
    let newVersionMetadatas = await this.filterOutExistingVersions(addon, pkg.versions);
    for (let versionName in newVersionMetadatas) {
      let versionMetadata = newVersionMetadatas[versionName];
      this.logger.info(`New version published for "${addon.name}": ${versionMetadata.version}`);
      let newVersion = await Version.createFromVersionMetadata(addon, versionMetadata);
      await this.uploadVersion(addon, newVersion);
    }
  }

  private async updateVersionAliases(addon: Addon, pkg: PackageMetadata) {
    let distTags = pkg['dist-tags'];
    for (let tag in distTags) {
      let versionId = distTags[tag];
      VersionAlias.createOrUpdate(tag, versionId, addon);
    }
  }

  private async findOrCreateAddon(pkg: PackageMetadata) {
    let addonName = pkg.name;
    let addon = await Addon.query().findById(addonName);
    if (addon == null) {
      this.logger.info(`New addon published: "${ pkg.name }`);
      addon = await Addon.createFromPackageMetadata(pkg);
    }
    return addon;
  }

  private async filterOutExistingVersions(addon: Addon, versionMetadatas: Dict<VersionMetadata>) {
    let existingVersionRecords = await addon.$relatedQuery('versions').where({ is_branch: false });
    let existingVersions = existingVersionRecords.map((version) => version.version);
    return omit(versionMetadatas, existingVersions);
  }

  private async uploadVersion(addon: Addon, version: Version) {
    let dir = await downloadTarball(version.tarballUrl);
    if (this.hasDocs(dir)) {
      this.logger.info(`${ addon.name }@${ version.version } has precompiled docs, uploading`);
      await this.saveDocs(addon, version, dir);
    } else {
      this.logger.info(`${ addon.name }@${ version.version } has no precompiled docs, skipping`);
    }
  }

  private hasDocs(extractedTarballDir: string) {
    let docsDataPath = path.join(extractedTarballDir, 'dist', 'docs.json');
    exists(docsDataPath);
  }

  private async saveDocs(addon: Addon, version: Version, dir: string): Promise<void> {
    await this.files.save('denali-docs', `${ addon.name }/release-${ version.version }/docs.json`, readStream(path.join(dir, 'dist', 'docs.json')));
  }

}
