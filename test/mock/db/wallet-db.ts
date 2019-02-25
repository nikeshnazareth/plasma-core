import { WalletDB } from "../../../src/services";
import { EthereumAccount } from "../../../src/services/models/eth";
import { mock, instance, when, anything, anyString } from 'ts-mockito';

const mockWalletDB = mock(WalletDB);
const accounts: { [key: string]: EthereumAccount } = {};
when(mockWalletDB.addAccount(anything())).thenCall((account: EthereumAccount) => {
  accounts[account.address] = account;
});
when(mockWalletDB.getAccount(anyString())).thenCall((address: string) => {
  return accounts[address];
});
when(mockWalletDB.started).thenReturn(true);

const walletdb = instance(mockWalletDB);

export { mockWalletDB, walletdb };
