import { mock, when, instance } from 'ts-mockito';
import { ChainDB } from '../../../src/services';
  
const mockChainDB = mock(ChainDB);
when(mockChainDB.started).thenReturn(true);

const chaindb = instance(mockChainDB);

export { mockChainDB, chaindb };
