import chai from 'chai';
import { mock, instance, when, capture } from 'ts-mockito';
import { LocalWalletProvider } from '../../../../src/services';
import { PlasmaApp } from '../../../../src/plasma';
import { walletdb, eth, mockETHProvider } from '../../../mock';
import { utils } from 'plasma-utils';

chai.should();
const web3Utils = utils.web3Utils;

describe('LocalWalletProvider', () => {
  // Mock the plasma app.
  const mockApp = mock(PlasmaApp);
  const app = instance(mockApp);

  when(mockApp.services).thenReturn({
    walletdb,
    eth
  } as any);

  const wallet = new LocalWalletProvider({
    app,
    name: 'wallet'
  });

  it('should have dependencies', () => {
    const dependencies = ['eth', 'walletdb'];
    wallet.dependencies.should.deep.equal(dependencies);
  });

  it('should have a name', () => {
    wallet.name.should.equal('wallet');
  });

  it('should a user to create an account', async () => {
    const address = await wallet.createAccount();
    web3Utils.isAddress(address).should.be.true;
  });
});
