import { describe, it, expect, beforeEach } from 'vitest';
import { LRUCache } from '../../src/lib/modelops/lru';

describe('LRUCache', () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    cache = new LRUCache<string, number>(3);
  });

  it('should store and retrieve values correctly', () => {
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    expect(cache.has('a')).toBe(true);
  });

  it('should return undefined for missing keys', () => {
    expect(cache.get('a')).toBeUndefined();
    expect(cache.has('a')).toBe(false);
  });

  it('should evict the oldest item when capacity is exceeded', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    
    // Capacity is 3, 'a' is oldest
    cache.set('d', 4);
    
    expect(cache.get('a')).toBeUndefined(); // Evicted
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('should move an item to the most recently used position on cache hit (get)', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    
    // Access 'a', making it the most recently used
    cache.get('a');
    
    // Add 'd', exceeding capacity. 'b' should be evicted because 'a' was recently accessed.
    cache.set('d', 4);
    
    expect(cache.get('b')).toBeUndefined(); // Evicted
    expect(cache.get('a')).toBe(1); // Survived
    expect(cache.get('c')).toBe(3); // Survived
    expect(cache.get('d')).toBe(4); // Newest
  });

  it('should move an item to the most recently used position on cache hit (set)', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    
    // Update 'a', making it most recently used
    cache.set('a', 10);
    
    // Add 'd', exceeding capacity. 'b' should be evicted.
    cache.set('d', 4);
    
    expect(cache.get('b')).toBeUndefined(); // Evicted
    expect(cache.get('a')).toBe(10); // Survived and updated
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('should correctly handle repeated access ordering', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    
    cache.get('a'); // Order: b -> a
    cache.get('b'); // Order: a -> b
    cache.get('a'); // Order: b -> a
    
    cache.set('c', 3); // Order: b -> a -> c
    cache.set('d', 4); // Evicts b. Order: a -> c -> d
    
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('should handle deletion of keys properly', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    
    expect(cache.delete('a')).toBe(true);
    expect(cache.get('a')).toBeUndefined();
    
    // Deleting a non-existent key
    expect(cache.delete('c')).toBe(false);
  });

  it('should allow insertion after eviction seamlessly', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4); // Evicts 'a'
    
    // Re-insert 'a'
    cache.set('a', 100); // Evicts 'b'
    
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(100);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('should handle a capacity of 1', () => {
    const tinyCache = new LRUCache<string, number>(1);
    tinyCache.set('a', 1);
    expect(tinyCache.get('a')).toBe(1);
    
    tinyCache.set('b', 2); // Evicts 'a'
    expect(tinyCache.get('a')).toBeUndefined();
    expect(tinyCache.get('b')).toBe(2);
  });

  it('should throw an error for invalid capacities', () => {
    expect(() => new LRUCache(0)).toThrow();
    expect(() => new LRUCache(-5)).toThrow();
  });
});
