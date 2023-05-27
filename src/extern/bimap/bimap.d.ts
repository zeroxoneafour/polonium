declare class BiMap<K, V> {
    push(key: K, value: V): void;
    set(key: K, value: V): void;
    key(key: K): V | null;
    val(value: V): K | null;
    removeKey(key: K): void;
    removeVal(value: V): void;
}
