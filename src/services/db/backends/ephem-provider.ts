import { BaseDBProvider } from './base-provider';

export class EphemDBProvider extends BaseDBProvider {
  db = new Map<string, string>();

  async start(): Promise<void> {
    return;
  }

  async get(key: string, fallback: any): Promise<any> {
    const result = this.db.get(key);
    if (!result) {
      if (arguments.length === 2) {
        return fallback;
      } else {
        throw new Error('Key not found in database');
      }
    }

    return this.jsonify(result);
  }

  async set(key: string, value: any): Promise<void> {
    value = this.stringify(value);
    this.db.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.db.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.db.has(key);
  }

  async findNextKey(key: string): Promise<string> {
    const prefix = key.split(':')[0]
    const keys = [...this.db.keys()];

    const nextKey = keys.filter((k) => {
      return k.startsWith(prefix);
    }).sort().find((k) => {
      return k > key;
    });

    if (!nextKey) {
      throw new Error('Could not find next key in database.');
    }
    return nextKey;
  }

  async bulkPut(objects: Array<{key: string, value: any}>): Promise<void> {
    for (const object of objects) {
      await this.set(object.key, object.value);
    }
  }

  async push(key: string, value: any): Promise<void> {
    const current = await this.get(key, []);
    current.push(value);
    await this.set(key, current);
  }
}
