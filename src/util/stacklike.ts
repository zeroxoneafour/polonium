export abstract class StackLike<T> implements Iterable<T> {
    abstract push(t: T): void;
    abstract pop(): T | undefined;
    abstract peek(): T | undefined;

    getAtIndex(idx: number): T | undefined {
        if (idx < 0) {
            return undefined;
        }
        let i = 0;
        for (const x of this) {
            if (idx == i) {
                return x;
            }
            i += 1;
        }
        return undefined;
    }
    abstract removeAtIndex(i: number): T | undefined;

    abstract get size(): number;
    abstract get isEmpty(): boolean;

    abstract [Symbol.iterator](): IterableIterator<T>;

    multipush(values: Iterable<T>): void {
        for (const value of values) {
            this.push(value);
        }
    }

    some(fn: (x: T) => boolean): boolean {
        for (const x of this) {
            if (fn(x)) {
                return true;
            }
        }
        return false;
    }

    indexOf(fn: (x: T) => boolean): number {
        let i = 0;
        for (const x of this) {
            if (fn(x)) {
                return i;
            }
            i += 1;
        }
        return -1;
    }
}
