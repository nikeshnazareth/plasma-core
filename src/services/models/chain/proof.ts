import { StateObject } from './state-object'
import { Transaction } from './transaction'

export interface TransactionProof {
  deposits: StateObject[]
  transactions: Transaction[]
}
