// util/queue.ts - Linked list queue

class Node<T> {
    value: T;
    next: Node<T> | null = null;
    constructor(value: T) {
        this.value = value;
    }
    append(node: Node<T>): Node<T> {
        this.next = node;
        return this.next;
    }
}

export class Queue<T> implements Iterable<T> {
    private head: Node<T> | null = null;
    private tail: Node<T> | null = null;
    private count: number = 0;

    constructor() {}

    push(value: T): void {
        if (this.head === null || this.tail === null) {
            this.head = new Node(value);
            this.tail = this.head;
        } else {
            this.tail = this.tail.append(new Node(value));
        }
        this.count += 1;
    }

    multipush(values: Iterable<T>): void {
        for (const value of values) {
            this.push(value);
        }
    }

    pop(): T | undefined {
        if (this.head === null) {
            return undefined;
        }
        const value = this.head.value;
        this.head = this.head.next;
        if (this.head === null) {
            this.tail = null;
        }
        this.count -= 1;
        return value;
    }

    peek(): T | undefined {
        return this.head?.value;
    }

    getAtIndex(index: number): T | undefined {
        let node = this.head;
        for (let i = 0; i < index; i += 1) {
            if (node === null) {
                return undefined;
            }
            node = node.next;
        }
        return node?.value;
    }

    removeAtIndex(index: number): T | undefined {
        if (index < 0 || index >= this.count) {
            return undefined;
        }
        let node = this.head;
        let prevNode: Node<T> | null = null;
        for (let i = 0; i < index; i += 1) {
            if (node === null) {
                return undefined;
            }
            prevNode = node;
            node = node.next;
        }
        if (node === null) return undefined;
        if (prevNode !== null) {
            prevNode.next = node.next;
        }
        return node.value;
    }

    get size(): number {
        return this.count;
    }
    get isEmpty(): boolean {
        return this.count === 0;
    }

    *[Symbol.iterator](): IterableIterator<T> {
        let currNode = this.head;
        while (currNode !== null) {
            let ret = currNode.value;
            currNode = currNode.next;
            yield ret;
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
        let node = this.head;
        for (let i = 0; i < this.count; i += 1) {
            if (node === null) {
                return -1;
            }
            if (fn(node.value)) {
                return i;
            }
            node = node.next;
        }
        return -1;
    }
}
