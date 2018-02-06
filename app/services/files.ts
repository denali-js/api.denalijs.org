import { Stream } from 'stream';
import { writeFile } from 'fs';
import * as path from 'path';
import { Service, lookup } from 'denali';
import ConfigService from 'denali/dist/lib/runtime/config';

export default class FilesService extends Service {

  localFilesRoot = path.join(process.cwd(), '.data', 'files');
  config = lookup<ConfigService>('service:config');

  async save(bucket: string, filepath: string, file: string | Stream): Promise<void> {
    if (this.config.get('environment') === 'production') {
      await this.uploadToAWS(bucket, filepath, file);
    } else {
      await this.saveToLocal(bucket, filepath, file);
    }
  }

  async uploadToAWS(bucket: string, filepath: string, file: string | Stream) {
    throw new Error('Not implemented');
  }

  async saveToLocal(bucket: string, filepath: string, file: string | Stream) {
    let dest = path.join(this.localFilesRoot, bucket, filepath);
    await new Promise((resolve, reject) => writeFile(dest, file, (err) => err ? reject(err) : resolve()));
  }

}
