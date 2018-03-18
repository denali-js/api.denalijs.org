import ApplicationModel from './application';

export default class RegistryChange extends ApplicationModel {

  static async updateLastSequence(seq: number) {
    await this.query().patchAndFetchById(1, { lastHandledSequence: seq });
  }

  static async getLastSequence(): Promise<number | null> {
    let record = await RegistryChange.query().findById(1);
    if (record) {
      return record.lastHandledSequence;
    }
    return null;
  }

  lastHandledSequence: number;

}
