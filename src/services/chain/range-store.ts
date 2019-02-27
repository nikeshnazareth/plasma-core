import BigNum from 'bn.js'

import { bnMax, bnMin } from '../../utils'

interface Range {
  start: BigNum
  end: BigNum
}

export interface BlockRange extends Range {
  block: BigNum
}

/**
 * RangeStore makes it easy to store ranges.
 * When ranges are added, only the sections with
 * a higher block number than existing ranges
 * that they overlap with will be inserted.
 */
export class RangeStore<T extends BlockRange> {
  public ranges: T[]

  constructor(ranges: T[] = []) {
    this.ranges = ranges
  }

  public addRange(range: T): void {
    if (range.start.gte(range.end)) {
      throw new Error('Invalid range')
    }

    const toAdd = new RangeStore([range])
    for (const existing of this.ranges) {
      const overlap: Range = {
        start: bnMax(existing.start, range.start),
        end: bnMin(existing.end, range.end),
      }

      // No overlap, can skip.
      if (overlap.start.gte(overlap.end)) {
        continue
      }

      if (existing.block.gt(range.block)) {
        // Existing range has a greater block number,
        // don't add this part of the new range.
        toAdd.removeRange(overlap)
      } else {
        // New range has a greater block number,
        // remove this part of the old range.
        this.removeRange(overlap)
      }
    }

    this.ranges = this.ranges.concat(toAdd.ranges)
    this.sortRanges()
  }

  public removeRange(range: Range): void {
    for (const existing of this.ranges) {
      const overlap: Range = {
        start: bnMax(existing.start, range.start),
        end: bnMin(existing.end, range.end),
      }

      // No overlap, can skip.
      if (overlap.start.gte(overlap.end)) {
        continue
      }

      // Remove the old range entirely.
      this.ranges = this.ranges.filter((r) => {
        return !r.start.eq(existing.start)
      })

      // Add back any of the left or right
      // portions of the old snapshot that didn't
      // overlap with the piece being removed.
      // For visual intuition:
      //
      // [-----------]   old snapshot
      //     [---]       removed range
      // |xxx|           left remainder
      //         |xxx|   right remainder

      // Add left remainder.
      if (existing.start.lt(overlap.start)) {
        this.ranges.push({
          ...existing,
          ...{
            end: overlap.start,
          },
        })
      }

      // Add right remainder.
      if (existing.end.gt(overlap.end)) {
        this.ranges.push({
          ...existing,
          ...{
            start: overlap.end,
          },
        })
      }
    }

    this.sortRanges()
  }

  private sortRanges(): void {
    this.ranges = this.ranges.sort((a, b) => {
      return a.start.sub(b.start).toNumber()
    })
  }
}
