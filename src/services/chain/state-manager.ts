import { RangeStore } from './range-store'
import { StateObject } from '../models/chain/state-object'

export class StateManager {
  private rangeStore: RangeStore<StateObject>

  constructor(state: StateObject[] = []) {
    this.rangeStore = new RangeStore<StateObject>(state)
  }

  get state(): StateObject[] {
    return this.rangeStore.ranges
  }

  public getOldStates(stateObject: StateObject): StateObject[] {
    return this.rangeStore.getOverlapping(stateObject)
  }

  public hasStateObject(stateObject: StateObject): boolean {
    const overlap = this.getOldStates(stateObject)
    return overlap.some((existing) => {
      return existing.equals(stateObject)
    })
  }

  /**
   * Forcibly adds a state object to the local state.
   * Should *only* be used for adding deposits and exits.
   * @param stateObject Object to add.
   */
  public addStateObject(stateObject: StateObject): void {
    this.rangeStore.addRange(stateObject)
  }

  /**
   * Applies a state object against the current state.
   * @param stateObject Object to apply.
   */
  public applyStateObject(stateObject: StateObject): void {
    const components = stateObject.components()

    for (const component of components) {
      if (component.implicit) {
        this.rangeStore.incrementBlocks(component)
      } else {
        this.rangeStore.addRange(component)
      }
    }
  }
}
