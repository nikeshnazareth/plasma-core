import chai from 'chai';
import { mock, instance, when, capture } from 'ts-mockito';
import { LocalWalletProvider } from '../../../../src/services';
import { PlasmaApp } from '../../../../src/plasma';
import { walletdb, eth, mockETHProvider } from '../../../mock';
import { utils } from 'plasma-utils';
import { account as accountlib } from 'eth-lib';

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

  let address: string;

  it('should have dependencies', () => {
    const dependencies = ['eth', 'walletdb'];
    wallet.dependencies.should.deep.equal(dependencies);
  });

  it('should have a name', () => {
    wallet.name.should.equal('wallet');
  });

  it('should a user to create an account', async () => {
    address = await wallet.createAccount();
    web3Utils.isAddress(address).should.be.true;
  });

  it('should get the accounts in the wallet', async () => {
    const accounts = await wallet.getAccounts();

    accounts.should.have.lengthOf(1);
    accounts.should.deep.equal([address]);
  });

  it('should get a single account', async () => {
    const account = await wallet.getAccount(address);
    const recovered = accountlib.fromPrivate(account.privateKey).address;

    recovered.should.equal(address);
  });

  it('should allow a user to sign some data', async () => {
    const data = 'hello';
    const hash = web3Utils.sha3(data);
    const sig = await wallet.sign(address, data);
    const recovered = accountlib.recover(hash, sig);

    recovered.should.equal(address);
  });
});
