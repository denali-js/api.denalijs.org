import { attr } from 'denali';
import { ObjectionAdapter } from 'denali-objection';
import ApplicationModel from './application';

export default class RegistryChange extends ApplicationModel {

  static get raw() {
    return (<ObjectionAdapter>this.adapter).objectionModels[this.modelName].query();
  }

  static get schema() {
    return Object.assign(super.schema, {
      lastHandledSequence: attr('number')
    });
  }

  static updateLastSequence(seq: number) {
    this.raw
    .patch({ lastHandledSequence: seq })
    .where('lastHandledSequence', '<', seq);
  }

  static async getLastSequence(): Promise<number | null> {
    let record = (await this.all())[0];
    if (record) {
      return record.lastHandledSequence;
    }
    return null;
  }

}
