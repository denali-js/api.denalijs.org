import { Model, snakeCaseMappers } from 'objection';

export default class ApplicationModel extends Model {

  static columnNameMappers = snakeCaseMappers();

  id: number;
  createdAt: Date;
  updatedAt: Date;

  $beforeInsert() {
    this.createdAt = new Date();
  }

  $afterInsert() {
    this.updatedAt = new Date();
  }

}
