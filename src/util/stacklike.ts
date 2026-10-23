// util/stacklike.ts - Common interface for push/pop containers

// method names and signatures match Array so a plain array (LIFO) satisfies this,
// while Queue implements it with FIFO pop
export interface StackLike<T> extends Iterable<T> {
    readonly length: number;
    push(...items: T[]): number;
    pop(): T | undefined;
    some(predicate: (value: T, index: number) => unknown): boolean;
    find(predicate: (value: T, index: number) => unknown): T | undefined;
    findIndex(predicate: (value: T, index: number) => unknown): number;
}
