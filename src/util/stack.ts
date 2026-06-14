import { StackLike } from "./stacklike";

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

export class Stack<T> extends StackLike<T> {
    private head: Node<T> | null = null;
    private count: number = 0;

    constructor() {
        super();
    }

    push(value: T): void {
        if (this.head === null) {
            this.head = new Node(value);
        } else {
            this.head = this.head.append(new Node(value));
        }
        this.count += 1;
    }

    pop(): T | undefined {
        if (this.head === null) {
            return undefined;
        }
        const value = this.head.value;
        this.head = this.head.next;
        this.count -= 1;
        return value;
    }

    peek(): T | undefined {
        return this.head?.value;
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
}
