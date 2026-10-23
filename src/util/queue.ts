// util/queue.ts - Array backed ring buffer queue

import { StackLike } from "./stacklike";

export class Queue<T> implements StackLike<T> {
    // slots outside of [head, head + count) are kept undefined so popped values can be collected
    private items: (T | undefined)[];
    private head: number = 0;
    private count: number = 0;

    constructor(capacity: number = 16) {
        this.items = new Array(Math.max(capacity, 1));
    }

    get length(): number {
        return this.count;
    }

    // maps a queue index (0 is the front) to an index in the backing array
    private slot(index: number): number {
        return (this.head + index) % this.items.length;
    }

    private grow(): void {
        const items = new Array<T | undefined>(this.items.length * 2);
        for (let i = 0; i < this.count; i += 1) {
            items[i] = this.items[this.slot(i)];
        }
        this.items = items;
        this.head = 0;
    }

    push(...values: T[]): number {
        for (const value of values) {
            if (this.count === this.items.length) {
                this.grow();
            }
            this.items[this.slot(this.count)] = value;
            this.count += 1;
        }
        return this.count;
    }

    // removes from the front, unlike Array.pop
    pop(): T | undefined {
        if (this.count === 0) {
            return undefined;
        }
        const value = this.items[this.head];
        this.items[this.head] = undefined;
        this.head = (this.head + 1) % this.items.length;
        this.count -= 1;
        return value;
    }

    removeAtIndex(index: number): T | undefined {
        if (index < 0 || index >= this.count) {
            return undefined;
        }
        const value = this.items[this.slot(index)];
        // shift everything after the index forward by one
        for (let i = index; i < this.count - 1; i += 1) {
            this.items[this.slot(i)] = this.items[this.slot(i + 1)];
        }
        this.items[this.slot(this.count - 1)] = undefined;
        this.count -= 1;
        return value;
    }

    some(predicate: (value: T, index: number) => unknown): boolean {
        return this.findIndex(predicate) !== -1;
    }

    find(predicate: (value: T, index: number) => unknown): T | undefined {
        const index = this.findIndex(predicate);
        return index === -1 ? undefined : (this.items[this.slot(index)] as T);
    }

    findIndex(predicate: (value: T, index: number) => unknown): number {
        for (let i = 0; i < this.count; i += 1) {
            if (predicate(this.items[this.slot(i)] as T, i)) {
                return i;
            }
        }
        return -1;
    }

    *[Symbol.iterator](): IterableIterator<T> {
        for (let i = 0; i < this.count; i += 1) {
            yield this.items[this.slot(i)] as T;
        }
    }
}
