import BigNum from 'bn.js'
import debug, { Debugger } from 'debug'
import _ from 'lodash'
import { serialization } from 'plasma-utils'

import {
  Deposit,
  Exit,
  Range,
  Snapshot,
  TransferComponent,
  UntypedRange,
  UntypedSnapshot,
} from '../models/chain'

const models = serialization.models
const Transfer = models.Transfer

/**
 * Determines the less of two BigNums.
 * @param a First BigNum.
 * @param b Second BigNum.
 * @returns the lesser of the two.
 */
const bnMin = (a: BigNum, b: BigNum) => {
  return a.lt(b) ? a : b
}

/**
 * Determines the greater of two BigNums.
 * @param a First BigNum.
 * @param b Second BigNum.
 * @returns the greater of the two.
 */
const bnMax = (a: BigNum, b: BigNum) => {
  return a.gt(b) ? a : b
}

/**
 * Utility class that manages state transitions.
 */
export class SnapshotManager {
  snapshots: Snapshot[]
  debug: Debugger = debug('debug:snapshots')

  constructor(snapshots: Snapshot[] = []) {
    this.snapshots = snapshots.map((snapshot) => {
      return new Snapshot(snapshot)
    })
  }

  /**
   * Returns a copy of the head state.
   * @returns the head state.
   */
  get state(): Snapshot[] {
    return _.cloneDeep(this.snapshots)
  }

  /**
   * Returns a list of ranges in the head state.
   * @returns a list of ranges.
   */
  get ranges(): Range[] {
    const ranges = this.snapshots.map(Range.fromSnapshot)
    return this.mergeRanges(ranges)
  }

  /**
   * Checks if the current state equals a given state.
   * @param snapshots A list of Snapshots.
   * @returns `true` if the states are equal, `false` otherwise.
   */
  equals(snapshots: Snapshot[]): boolean {
    for (let i = 0; i < snapshots.length; i++) {
      if (!this.snapshots[i].equals(snapshots[i])) {
        return false
      }
    }
    return true
  }

  /**
   * Merges the state of another SnapshotManager into this one.
   * @param other Other manager.
   */
  merge(other: SnapshotManager): void {
    this.debug('Merging snapshots')
    for (const snapshot of other.state) {
      try {
        this.addSnapshot(snapshot)
      } catch (err) {
        continue
      }
    }
  }

  /**
   * Returns a list of ranges owned by a specific address.
   * @param address Address to query.
   * @returns a list of owned ranges.
   */
  getOwnedRanges(address: string): Range[] {
    return this.ranges.filter((range) => {
      return range.owner === address
    })
  }

  /**
   * Returns a list of snapshots owned by a specific address.
   * @param address Address to query.
   * @return a list of owned snapshots.
   */
  getOwnedSnapshots(address: string): UntypedSnapshot[] {
    return this.snapshots.map(UntypedSnapshot.from).filter((snapshot) => {
      return snapshot.owner === address
    })
  }

  /**
   * Picks snapshots that cover a given amount.
   * @param address An address.
   * @param token A token address.
   * @param amount Number of tokens being sent.
   * @returns a list of snapshots.
   */
  pickSnapshots(
    address: string,
    token: BigNum,
    amount: BigNum
  ): UntypedSnapshot[] {
    const ownedSnapshots = this.getOwnedSnapshots(address)
    return this.pickElements(ownedSnapshots, token, amount)
  }

  /**
   * Picks the best ranges for a given transaction.
   * @param address An address.
   * @param token A token address.
   * @param amount Number of tokens being sent.
   * @returns a list of ranges to use for the transaction.
   */
  pickRanges(address: string, token: BigNum, amount: BigNum): Range[] {
    const ownedRanges = this.getOwnedRanges(address)
    return this.pickElements(ownedRanges, token, amount)
  }

  /**
   * Checks if a transaction would be valid given the local state.
   * @param transaction A Transaction object.
   * @returns `true` if the transaction is valid, `false` otherwise.
   */
  validateTransaction(
    transaction: serialization.models.UnsignedTransaction
  ): boolean {
    return transaction.transfers.every((transfer) => {
      const snapshot = Snapshot.from({
        ...transfer,
        ...{
          block: transaction.block,
        },
      })
      return this.hasSnapshot(snapshot) && snapshot.valid
    })
  }

  /**
   * Applies a Deposit to the local state.
   * @param deposit Deposit to apply.
   */
  applyDeposit(deposit: Deposit): void {
    const snapshot = Snapshot.from(deposit)
    this.addSnapshot(snapshot)
  }

  /**
   * Applies an Exit to the local state.
   * @param {Exit} exit Exit to apply.
   */
  applyExit(exit: Exit): void {
    const snapshot = Snapshot.from(exit)
    this.addSnapshot(snapshot)
  }

  /**
   * Applies a sent transaction to the local state.
   * This is a special case because we don't actually care
   * if the state transition is valid when sending transactions.
   * @param transaction Transaction to apply.
   */
  applySentTransaction(
    transaction: serialization.models.UnsignedTransaction
  ): void {
    const snapshots = transaction.transfers.map((transfer) => {
      return Snapshot.from({
        ...transfer,
        ...{
          block: transaction.block,
        },
      })
    })

    for (const snapshot of snapshots) {
      this.addSnapshot(snapshot)
    }
  }

  /**
   * Applies an empty block.
   * @param block The block number.
   */
  applyEmptyBlock(block: number): void {
    this.debug(`Applying empty block: ${block.toString(10)}`)
    for (const snapshot of this.snapshots) {
      if (snapshot.block.addn(1).eqn(block)) {
        snapshot.block = snapshot.block.addn(1)
      }
    }
  }

  /**
   * Applies a Transaction to the local state.
   * @param transaction Transaction to apply.
   */
  applyTransfer(transfer: ApplyableTransfer): void {
    // Pull out all of the transfer components (implicit and explicit).
    const components = this.getTransferComponents(transfer)

    for (const component of components) {
      this.applyTransferComponent(component)
    }
  }

  /**
   * Applies a single TransferComponent to the local state.
   * @param component Component to apply.
   */
  private applyTransferComponent(component: TransferComponent): void {
    this.debug(`Applying transaction component: ${component.prettify()}`)

    // Determine which snapshots overlap with this component.
    const overlapping = this.snapshots.filter((snapshot) => {
      return bnMax(snapshot.start, component.start).lt(
        bnMin(snapshot.end, component.end)
      )
    })

    // Apply this component to each snapshot that it overlaps.
    for (const snapshot of overlapping) {
      if (!this.validStateTransition(snapshot, component)) {
        continue
      }

      // Remove the old snapshot.
      this.removeSnapshot(snapshot)

      // Insert any newly created snapshots.
      if (snapshot.start.lt(component.start)) {
        this.addSnapshot(
          new Snapshot({
            ...snapshot,
            ...{
              end: component.start,
            },
          })
        )
      }
      if (snapshot.end.gt(component.end)) {
        this.addSnapshot(
          new Snapshot({
            ...snapshot,
            ...{
              start: component.end,
            },
          })
        )
      }
      this.addSnapshot(
        new Snapshot({
          start: bnMax(snapshot.start, component.start),
          end: bnMin(snapshot.end, component.end),
          block: component.block,
          owner: component.implicit ? snapshot.owner : component.recipient,
        })
      )
    }
  }

  /**
   * Inserts a snapshot into the local store of snapshots.
   * @param snapshot Snapshot to insert.
   */
  private addSnapshot(snapshot: Snapshot): void {
    if (!snapshot.valid) {
      throw new Error('Invalid snapshot')
    }
    this.debug(`Adding snapshot: ${snapshot.prettify()}`)

    this.snapshots.push(snapshot)
    this.snapshots.sort((a, b) => {
      return a.start.sub(b.start).toNumber()
    })
    this.snapshots = this.removeOverlapping(this.snapshots)
    this.snapshots = this.mergeSnapshots(this.snapshots)
  }

  /**
   * Removes a snapshot from the local store of snapshots.
   * @param snapshot Snapshot to remove.
   */
  private removeSnapshot(snapshot: Snapshot): void {
    this.snapshots = this.snapshots.filter((existing) => {
      return !existing.equals(snapshot)
    })
  }

  /**
   * Merges and reduces a list of snapshots.
   * Combines any snapshots that share the same start or end
   * and also share the same block number and owner.
   * @param snapshots A list of Snapshot objects.
   * @returns the merged list of Snapshot objects.
   */
  private mergeSnapshots(snapshots: Snapshot[]): Snapshot[] {
    const merged: Snapshot[] = []

    snapshots.forEach((snapshot) => {
      let left, right
      merged.forEach((s, i) => {
        if (!s.block.eq(snapshot.block) || s.owner !== snapshot.owner) {
          return
        }

        if (s.end.eq(snapshot.start)) {
          left = i
        }
        if (s.start.eq(snapshot.end)) {
          right = i
        }
      })

      if (left !== undefined) {
        merged[left].end = snapshot.end
      }
      if (right !== undefined) {
        merged[right].start = snapshot.start
      }
      if (left === undefined && right === undefined) {
        merged.push(snapshot)
      }
    })

    return merged
  }

  /**
   * Removes any overlapping snapshots by giving preference to the later
   * snapshot.
   * @param snapshots A list of snapshots.
   * @returns the list with overlapping snapshots resolved.
   */
  private removeOverlapping(snapshots: Snapshot[]): Snapshot[] {
    // Sort by start, then end.
    snapshots.sort((a, b) => {
      if (!a.start.eq(b.start)) {
        return a.start.sub(b.start).toNumber()
      } else {
        return a.end.sub(b.end).toNumber()
      }
    })

    // Resolve any overlap by giving preference
    // to the snapshot with the highest block.
    let reduced: Snapshot[] = []
    for (let snapshotA of snapshots) {
      // Because we already sorted by start and end,
      // we can easily catch overlap by seeing if the start
      // of the next element comes before the end of one
      // of the previous ones.
      const overlapping = reduced.filter((snapshotB) => {
        return snapshotA.start.lt(snapshotB.end)
      })

      // Break up overlapping components.
      let remainder = true
      for (const snapshotB of overlapping) {
        // Only overwrite if new snapshot has a higher
        // block number than the old snapshot.
        if (snapshotA.block.gte(snapshotB.block)) {
          // Remove the old snapshot.
          reduced = reduced.filter((el) => {
            return !el.equals(snapshotB)
          })

          // Add back any of the left or right
          // portions of the old snapshot that didn't
          // overlap with the new snapshot.
          // For visual intuition:
          //
          // [-----------]   old snapshot
          //     [---]       new snapshot
          // |xxx|           left remainder
          //         |xxx|   right remainder
          if (snapshotB.start.lt(snapshotA.start)) {
            reduced.push(
              new Snapshot({
                ...snapshotB,
                ...{
                  end: snapshotA.start,
                },
              })
            )
          }
          if (snapshotB.end.gt(snapshotA.end)) {
            reduced.push(
              new Snapshot({
                ...snapshotB,
                ...{
                  start: snapshotA.end,
                },
              })
            )
          }

          // Add the new overlapping part.
          reduced.push(
            new Snapshot({
              ...snapshotA,
              ...{
                end: bnMin(snapshotA.end, snapshotB.end),
              },
            })
          )
        }

        // Check if the new snapshot went beyond the end of the old one.
        // If so, we have to continue the process with the remainder.
        if (snapshotA.end.gt(snapshotB.end)) {
          snapshotA = new Snapshot({
            ...snapshotA,
            ...{
              start: snapshotB.end,
            },
          })
        } else {
          remainder = false
          break
        }
      }

      // Add any remainder.
      if (remainder) {
        reduced.push(snapshotA)
      }
    }

    return reduced
  }

  /**
   * Merges and reduces a list of ranges.
   * Combines any ranges that share the same start or end
   * and also share the same owner.
   * @param ranges A list of Range objects.
   * @returns the merged list of Range objects.
   */
  private mergeRanges(ranges: Range[]): Range[] {
    const orderRanges = (rangeA: Range, rangeB: Range): Range[] => {
      if (rangeA.owner !== rangeB.owner || rangeA.end.lt(rangeB.start)) {
        return [rangeA, rangeB]
      } else if (rangeA.start.eq(rangeB.end)) {
        rangeB.end = rangeA.end
        return [rangeB]
      } else if (rangeA.end.eq(rangeB.start)) {
        rangeB.start = rangeA.start
        return [rangeB]
      } else {
        return [rangeB, rangeA]
      }
    }

    // Sort by address and then by start.
    ranges.sort((a, b) => {
      if (a.owner !== b.owner) {
        return a.owner < b.owner ? -1 : 1
      } else {
        return a.start.sub(b.start).toNumber()
      }
    })

    return ranges.reduce((merged: Range[], range) => {
      const lastRange = merged.pop()
      if (lastRange === undefined) return [range]
      return merged.concat(orderRanges(lastRange, range))
    }, [])
  }

  /**
   * Determines if the local state contains a specific snapshot.
   * @param snapshot A Snapshot object.
   * @returns `true` if the state contains the snapshot, `false` otherwise.
   */
  private hasSnapshot(snapshot: Snapshot): boolean {
    return this.snapshots.some((existing) => {
      return existing.contains(snapshot)
    })
  }

  /**
   * Checks whether a transfer is a valid state transition from an existing
   * snapshot.
   * @param snapshot Existing snapshot object.
   * @param transfer Transfer from one user to another.
   * @returns `true` if the transition is valid, `false` otherwise.
   */
  private validStateTransition(
    snapshot: Snapshot,
    transfer: TransferComponent
  ): boolean {
    const validSender = transfer.implicit || snapshot.owner === transfer.sender
    const validBlock = snapshot.block.addn(1).eq(transfer.block)
    return validSender && validBlock
  }

  /**
   * Break down the list of TransferComponents that make up a Transfer.
   * @param transfer A Transfer object.
   * @returns a list of TransferComponents.
   */
  private getTransferComponents(
    transfer: serialization.models.Transfer
  ): TransferComponent[] {
    const serialized = new Transfer(transfer)
    serialized.block = transfer.block
    serialized.implicitStart = transfer.implicitStart
    if (transfer.implicitStart === undefined) {
      serialized.implicitStart = serialized.typedStart
    }
    serialized.implicitEnd = transfer.implicitEnd
    if (transfer.implicitEnd === undefined) {
      serialized.implicitEnd = serialized.typedEnd
    }

    const components = []

    // TODO: Get rid of this.
    if (
      serialized.typedStart === undefined ||
      serialized.typedEnd === undefined ||
      serialized.implicitStart === undefined ||
      serialized.implicitEnd === undefined
    ) {
      throw new Error('Invalid Tranfer.')
    }

    // Left implicit component.
    if (!serialized.typedStart.eq(serialized.implicitStart)) {
      components.push(
        TransferComponent.from({
          ...serialized,
          ...{
            start: serialized.implicitStart,
            end: serialized.typedStart,
            implicit: true,
          },
        })
      )
    }

    // Right implicit component.
    if (!serialized.typedEnd.eq(serialized.implicitEnd)) {
      components.push(
        TransferComponent.from({
          ...serialized,
          ...{
            start: serialized.typedEnd,
            end: serialized.implicitEnd,
            implicit: true,
          },
        })
      )
    }

    // Transfer (non-implicit) component.
    components.push(
      TransferComponent.from({
        ...serialized,
        ...{
          start: serialized.typedStart,
          end: serialized.typedEnd,
        },
      })
    )

    return components
  }

  /**
   * Picks elements from a list that cover a given amount.
   * @param arr List to pick from.
   * @param token A token address.
   * @param amount Number of tokens being sent.
   * @returns a list of items that cover the amount.
   */
  private pickElements<T extends UntypedRange>(
    arr: T[],
    token: BigNum,
    amount: BigNum
  ): T[] {
    const available = arr
      .filter((item) => {
        return item.token.eq(token)
      })
      .sort((a, b) => {
        return b.end
          .sub(b.start)
          .sub(a.end.sub(a.start))
          .toNumber()
      })
    const picked: T[] = []

    while (amount.gtn(0)) {
      const smallest = available.pop()
      if (smallest === undefined) {
        throw new Error(
          'Address does not have enough balance to cover the amount.'
        )
      }

      const smallestAmount = smallest.end.sub(smallest.start)

      if (smallestAmount.lte(amount)) {
        picked.push(smallest)
        amount = amount.sub(smallestAmount)
      } else {
        picked.push({
          ...smallest,
          ...{
            end: smallest.start.add(amount),
          },
        })
        break
      }
    }

    picked.sort((a, b) => {
      if (!a.token.eq(b.token)) {
        return a.token.sub(b.token).toNumber()
      } else {
        return a.start.sub(b.start).toNumber()
      }
    })

    return picked
  }
}
