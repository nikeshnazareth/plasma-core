import chai from 'chai';
import { GuardService } from '../../../src/services';
import { mock, instance } from 'ts-mockito';
import { PlasmaApp } from '../../../src/plasma';

describe('GuardService', () => {
  // Mock the plasma app.
  const mockApp = mock(PlasmaApp);
  const app = instance(mockApp);

  const guard = new GuardService({
    app,
    name: 'guard'
  });

  beforeEach(async () => {
    await guard.start();
  });

  afterEach(async () => {
    await guard.stop();
  });

  it('should have dependencies', () => {
    const dependencies = ['eventHandler'];
    guard.dependencies.should.deep.equal(dependencies);
  });

  it('should have a name', () => {
    guard.name.should.equal('guard');
  });

  it('should start correctly', () => {
    guard.started.should.be.true;
  });
});

chai.should();
