import { StateObject } from './state-object'

export interface Transaction {
  block: number
  inclusionProof: string[]
  witness: string
  newState: StateObject
  hash: string
  encoded: string
}
