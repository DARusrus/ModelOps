/**
 * A true O(1) LRU (Least Recently Used) Cache implementation.
 * Uses a doubly linked list combined with a Hash Map to ensure constant time
 * operations for insertions, lookups, and evictions, circumventing V8 Map
 * compaction/garbage collection edge cases.
 */

class LRUNode<K, V> {
  key: K;
  value: V;
  prev: LRUNode<K, V> | null = null;
  next: LRUNode<K, V> | null = null;

  constructor(key: K, value: V) {
    this.key = key;
    this.value = value;
  }
}

export class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, LRUNode<K, V>>;
  private head: LRUNode<K, V> | null = null;
  private tail: LRUNode<K, V> | null = null;

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('LRUCache capacity must be greater than 0');
    }
    this.capacity = capacity;
    this.cache = new Map();
  }

  private removeNode(node: LRUNode<K, V>) {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    node.prev = null;
    node.next = null;
  }

  private insertAtTail(node: LRUNode<K, V>) {
    if (!this.head || !this.tail) {
      this.head = node;
      this.tail = node;
    } else {
      this.tail.next = node;
      node.prev = this.tail;
      this.tail = node;
    }
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    const node = this.cache.get(key)!;
    // Move to end (most recently used)
    this.removeNode(node);
    this.insertAtTail(node);

    return node.value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      const node = this.cache.get(key)!;
      node.value = value;
      this.removeNode(node);
      this.insertAtTail(node);
      return;
    }

    if (this.cache.size >= this.capacity && this.head) {
      // Evict the least recently used item (head)
      const lruKey = this.head.key;
      this.removeNode(this.head);
      this.cache.delete(lruKey);
    }

    const newNode = new LRUNode(key, value);
    this.insertAtTail(newNode);
    this.cache.set(key, newNode);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }
  
  delete(key: K): boolean {
    if (!this.cache.has(key)) return false;
    const node = this.cache.get(key)!;
    this.removeNode(node);
    this.cache.delete(key);
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }
}
