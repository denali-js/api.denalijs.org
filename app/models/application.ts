import { Model, attr } from '@denali-js/core';

export default class ApplicationModel extends Model {

  static abstract = true;

  static get schema() {
    return {
      createdAt: attr('date'),
      updatedAt: attr('date')
    };
  }

  createdAt: Date;
  updatedAt: Date;

  save() {
    this.createdAt = this.createdAt || new Date();
    this.updatedAt = new Date();
    return super.save();
  }

}
