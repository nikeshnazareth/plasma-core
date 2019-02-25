import chai from 'chai';
import { createApp } from '../../../mock';
import { DBService } from '../../../../src/services';

const should = chai.should();

describe('DBService', () => {
  const { app } = createApp();

  const dbservice = new DBService({
    app,
    name: 'dbservice'
  });

  it('should open a DB', async () => {
    const expected = 'dbname';
    await dbservice.open(expected);
    should.exist(dbservice.dbs[expected]);
  });

  it('should open two DBs', async () => {
    const db1Name = 'db1';
    const db2Name = 'db2';
    await dbservice.open(db1Name);
    await dbservice.open(db2Name);
    const db1 = dbservice.dbs[db1Name];
    const db2 = dbservice.dbs[db2Name];

    should.exist(db1);
    should.exist(db2);
    db1.should.not.deep.equal(db2);
  });
});
