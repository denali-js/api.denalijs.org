import { Stream } from 'stream';
import { writeFileSync as writeFile } from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { Service, lookup, ConfigService, Logger } from '@denali-js/core';
import AWS from 'aws-sdk';

const s3 = new AWS.S3({apiVersion: '2006-03-01', region: 'us-west-2'});
const upload = promisify(s3.upload.bind(s3));

export default class FilesService extends Service {

  localFilesRoot = path.join(process.cwd(), '.data', 'files');
  config = lookup<ConfigService>('service:config');
  logger = lookup<Logger>('app:logger');

  private mockServer: any;

  constructor() {
    super();
    if (this.config.get('environment') !== 'production') {
      this.startMockFileServer();
    }
  }

  async save(bucket: string, filepath: string, file: string | Stream): Promise<string> {
    if (this.config.get('environment') === 'production') {
      return await this.uploadToAWS(bucket, filepath, file);
    } else {
      return await this.saveToLocal(bucket, filepath, file);
    }
  }

  private async uploadToAWS(bucket: string, filepath: string, file: string | Stream): Promise<string> {
    let params = { Bucket: bucket, Key: filepath, Body: file };
    let result: AWS.S3.ManagedUpload.SendData = await upload(params);
    return result.Location;
  }

  private async saveToLocal(bucket: string, filepath: string, file: string | Stream): Promise<string> {
    let dest = path.join(this.localFilesRoot, bucket, filepath);
    const mkdirp = require('mkdirp').sync;
    mkdirp(path.dirname(dest));
    writeFile(dest, file);
    return `${ this.mockServerHost }/${ bucket }/${ filepath }`;
  }

  private get mockServerPort() {
    return <number>this.config.getWithDefault('server', 'port', 3000) + 1;
  }

  private get mockServerHost() {
    return `http://localhost:${ this.mockServerPort }`;
  }

  private startMockFileServer() {
    // Lazy require so we don't have to ship static-server to prod
    const StaticServer = require('static-server');
    this.mockServer = new StaticServer({
      rootPath: this.localFilesRoot,
      name: 'mock-file-server',
      port: this.mockServerPort,
      cors: '*'
    });
    this.mockServer.start(() => this.logger.info(`Mock file server started on port ${ this.mockServerPort }`));
  }

}
