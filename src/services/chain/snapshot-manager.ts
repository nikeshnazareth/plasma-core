import debug, { Debugger } from 'debug'
import _ from 'lodash'

import { StateObject } from '../models/chain/state-object'
import { bnMin } from '../../utils'

/**
 * Utility class that manages state transitions.
 */
export class SnapshotManager {
  public snapshots: StateObject[]
  public debug: Debugger = debug('debug:snapshots')

  constructor(snapshots: StateObject[] = []) {
    this.snapshots = snapshots
  }

  /**
   * Returns a copy of the head state.
   * @returns the head state.
   */
  get state(): StateObject[] {
    return _.cloneDeep(this.snapshots)
  }

  /**
   * Checks if the current state equals a given state.
   * @param snapshots A list of Snapshots.
   * @returns `true` if the states are equal, `false` otherwise.
   */
  public equals(snapshots: StateObject[]): boolean {
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
  public merge(other: SnapshotManager): void {
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
   * Inserts a snapshot into the local store of snapshots.
   * @param snapshot Snapshot to insert.
   */
  public addSnapshot(snapshot: StateObject): void {
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
  public removeSnapshot(snapshot: StateObject): void {
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
  private mergeSnapshots(snapshots: StateObject[]): StateObject[] {
    const merged: StateObject[] = []

    snapshots.forEach((snapshot) => {
      let left
      let right
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
  private removeOverlapping(snapshots: StateObject[]): StateObject[] {
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
    let reduced: StateObject[] = []
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

          /**
           * Add back any of the left or right
           * portions of the old snapshot that didn't
           * overlap with the new snapshot.
           * For visual intuition:
           *
           * [-----------]   old snapshot
           *     [---]       new snapshot
           * |xxx|           left remainder
           *         |xxx|   right remainder
           */

          // Left remainder.
          if (snapshotB.start.lt(snapshotA.start)) {
            reduced.push(
              new StateObject({
                ...snapshotB,
                ...{
                  end: snapshotA.start,
                },
              })
            )
          }

          // Right remainder.
          if (snapshotB.end.gt(snapshotA.end)) {
            reduced.push(
              new StateObject({
                ...snapshotB,
                ...{
                  start: snapshotA.end,
                },
              })
            )
          }

          // Add the new overlapping part.
          reduced.push(
            new StateObject({
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
          snapshotA = new StateObject({
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
}
