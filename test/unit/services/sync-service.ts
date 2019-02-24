import chai from 'chai';
import BigNum from 'bn.js';
import { mock, when, instance, capture, anyString, anyFunction, anything } from 'ts-mockito';

import {SyncService} from '../../../src/services/sync-service';
import { PlasmaApp } from '../../../src/plasma';
import { EventHandler, ChainService, ChainDB } from '../../../src/services';
import { DepositEvent, BlockSubmittedEvent, ExitStartedEvent, ExitFinalizedEvent } from '../../../src/services/models/events';

chai.should();

describe('SyncService', () => {
  // Create mock event handler.
  const mockEventHandler = mock(EventHandler);
  const listeners: { [key: string]: Function } = {};
  const mockEmitterOn = (event: string, listener: Function) => {
    listeners[event] = listener;
    return mockEventHandler;
  };
  const mockEmitterEmit = (event: string, ...args: object[]) => {
    listeners[event](...args);
    return true;
  };
  when(mockEventHandler.on(anyString(), anyFunction())).thenCall(mockEmitterOn);
  when(mockEventHandler.emit(anyString(), anything())).thenCall(mockEmitterEmit);
  when(mockEventHandler.started).thenReturn(true);

  // Create mock chain service.
  const mockChainService = mock(ChainService);
  when(mockChainService.started).thenReturn(true);

  // Crate mock chaindb.
  const mockChainDB = mock(ChainDB);
  when(mockChainDB.started).thenReturn(true);

  // Create mock instances.
  const eventHandler = instance(mockEventHandler);
  const chain = instance(mockChainService);
  const chaindb = instance(mockChainDB);

  // Create mock app.
  const mockApp = mock(PlasmaApp);
  when(mockApp.services).thenReturn({
    eventHandler,
    chaindb,
    chain
  } as any);
  const app = instance(mockApp);

  const sync = new SyncService({
    app,
    name: 'sync',
    transactionPollInterval: 100
  });

  beforeEach(async () => {
    await sync.start();
  });

  afterEach(async () => {
    await sync.stop();
  });

  after(async () => {
    await app.stop();
  });

  it('should have dependencies', () => {
    const dependencies = ['eth', 'chain', 'eventHandler', 'syncdb', 'chaindb', 'wallet', 'operator'];
    sync.dependencies.should.deep.equal(dependencies);
  });

  it('should start correctly', () => {
    sync.started.should.be.true;
  });

  it('should react to new deposits', () => {
    const depositEvent = new DepositEvent({
      token: new BigNum(0),
      start: new BigNum(0),
      end: new BigNum(100),
      block: new BigNum(0),
      owner: '0x123'
    });
    const deposit = depositEvent.toDeposit();
    eventHandler.emit('event:Deposit', [depositEvent]);

    const callArgs = capture(mockChainService.addDeposits).last();
    callArgs[0].should.deep.equal([deposit]);
  });

  it('should react to new blocks', () => {
    const blockSubmittedEvent = new BlockSubmittedEvent({
      number: 0,
      hash: '0x0'
    });
    const block = blockSubmittedEvent.toBlock();
    eventHandler.emit('event:BlockSubmitted', [blockSubmittedEvent]);

    const callArgs = capture(mockChainDB.addBlockHeaders).last();
    callArgs[0].should.deep.equal([block]);
  });

  it('should react to new exits', () => {
    const exitStartedEvent = new ExitStartedEvent({
      token: new BigNum(0),
      start: new BigNum(0),
      end: new BigNum(100),
      block: new BigNum(0),
      id: new BigNum(0),
      owner: '0x123'
    });
    const exit = exitStartedEvent.toExit();
    eventHandler.emit('event:ExitStarted', [exitStartedEvent]);

    const callArgs = capture(mockChainService.addExit).last();
    callArgs[0].should.deep.equal(exit);
  });
});
