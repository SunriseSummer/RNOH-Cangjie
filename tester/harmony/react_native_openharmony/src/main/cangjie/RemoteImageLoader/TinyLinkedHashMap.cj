/**
 * @file
 *
 * This file defines HashMap and related classes.
 */
package reactnative_ohcj.RemoteImageLoader


struct TinyLinkedHashMapEntry<K, V> {
    public let hash: Int64
    public let next: Int64
    public let key: K
    public let value: V

    @Frozen
    init(h: Int64, n: Int64, k: K, v: V) {
        hash = h
        next = n
        key = k
        value = v
    }

    @Frozen
    init() {
        hash = -1
        next = -1
        key = unsafe { zeroValue<K>() }
        value = unsafe { zeroValue<V>() }
    }
}


/**
 * The hashmap is implemented based on the hash algorithm.
 * You can use put key-value to obtain the value and get key to obtain the value.
 *
 * @since 0.18.4
 */
protected class TinyLinkedHashMap<K, V>  where K <: Hashable & Equatable<K> {
    /* Max size of buckets. */
    private static const MAX_BUCKET_SIZE = 4611686018427387904

    /*
     * Load factor of the HashMap.
     * Capacity expansion when the usage more than 75%
     */
    private static const LOAD_FACTOR = 0.75f32

    /*
     * default Initialized Capacity.
     * Default array initialization size is 16
     */
    private static const DEFAULT_CAPACITY = 16

    /* Maximum number of int64 types. */
    /* Subscripts that can be directly inserted */
    var appendIndex = 0

    /* Subscript of the currently available deleted entry. */
    var freeIndex = -1

    /* Total number of deleted entries that are available. */
    var freeSize = 0

    /* Modified hashmap version. */
    var modCount = 0b00000000

    /* Index Array. */
    var buckets: Array<Int64>

    /* Element Array. */
    var entries: Array<TinyLinkedHashMapEntry<K, V>>
    
    /* Record the index of the previous node for each node. */
    var before: Array<Int64>
    
    /* Record the index of the next node for each node. */
    var after: Array<Int64>
    
    /* Index of the head node of the double linked list. */
    var head = -1
    
    /* Index of the tail node of the double linked list. */
    var tail = -1

    /**
     * Initializes an empty HashMap with a default initial DEFAULT_CAPACITY (16) and a default load factor.
     *
     * @since 0.18.4
     */
    @Frozen
    public init() {
        buckets = Array<Int64>(DEFAULT_CAPACITY, repeat: -1)
        entries = Array<TinyLinkedHashMapEntry<K, V>>(
            DEFAULT_CAPACITY,
            repeat: TinyLinkedHashMapEntry<K, V>()
        )
        before = Array<Int64>(DEFAULT_CAPACITY, repeat: -1)
        after = Array<Int64>(DEFAULT_CAPACITY, repeat: -1)
    }

    /**
     * Initializes a HashMap with an incoming @p DEFAULT_CAPACITY for initialization.
     *
     * @param capacity an incoming capacity is initialized.
     *
     * @throws IllegalArgumentException if capacity is less than zero
     *
     * @since 0.18.4
     */
    @Frozen
    public init(capacity: Int64) {
        if (capacity < 0) {
            throw IllegalArgumentException("Invalid size of HashMap: ${capacity}.")
        }
        let bucketSize = capacity + (capacity >> 1)
        buckets = Array<Int64>(tableSizeFor(bucketSize), repeat: -1)
        entries = Array<TinyLinkedHashMapEntry<K, V>>(capacity, repeat: TinyLinkedHashMapEntry<K, V>())
        before = Array<Int64>(capacity, repeat: -1)
        after = Array<Int64>(capacity, repeat: -1)
    }

    /**
     * Returns value Iterator<T> - Iterator<T> type, which can be traversed using an iterator.
     *
     * @param key transfer key to obtain the value.
     * @return the value corresponding to the return key is encapsulated with option.
     *
     * @since 0.18.4
     */
    @Frozen
    public func get(key: K): ?V {
        let hash = getHash(key.hashCode())
        let index = getIndex(hash, buckets.size)
        var bucket = buckets[index]
        while (bucket >= 0) {
            if (hash == entries[bucket].hash && key == entries[bucket].key) {
                return entries[bucket].value
            }
            bucket = entries[bucket].next
        }
        return None
    }

    /**
     * Associates the specified @p value with the specified @p key in this map.
     * If you map a mapping that previously contained a key, the old value is replaced.
     *
     * @param key the key to put.
     * @param value the value to assign.
     * @return If the key exists before the assignment, the value before the assignment is encapsulated with Option.
     * Otherwise, return None
     *
     * @since 0.18.4
     */
    @Frozen
    @OverflowWrapping
    public func add(key: K, value: V): ?V {
        let hash = getHash(key.hashCode())
        var bucketIndex = getIndex(hash, buckets.size)
        var entryIndex = buckets[bucketIndex]
        while (entryIndex >= 0) {
            if (hash == entries[entryIndex].hash && key == entries[entryIndex].key) {
                let oldValue = entries[entryIndex].value
                entries[entryIndex] = TinyLinkedHashMapEntry<K, V>(entries[entryIndex].hash, entries[entryIndex].next,
                    entries[entryIndex].key, value)
                return oldValue
            }
            entryIndex = entries[entryIndex].next
        }
        if (freeSize > 0) {
            entryIndex = freeIndex
            freeIndex = entries[entryIndex].next
            freeSize--
        } else {
            if (resize(size + 1)) {
                bucketIndex = getIndex(hash, buckets.size)
            }
            entryIndex = appendIndex
            appendIndex++
        }

        entries[entryIndex] = TinyLinkedHashMapEntry<K, V>(hash, buckets[bucketIndex], key, value)
        // Add the new node to the end of the list
        linkNodeLast(entryIndex)
        modCount++
        buckets[bucketIndex] = entryIndex
        return None
    }

    /**
     * Removes the key-value pair corresponding to the key based on the specified key from this mapping, if one exists.
     *
     * @param key pass in the key to be deleted.
     * @return removed element
     *
     * @since 0.18.4
     */
    @Frozen
    @OverflowWrapping
    public func remove(key: K): ?V {
        let NULL_KEY = unsafe { zeroValue<K>() }
        let NULL_VALUE = unsafe { zeroValue<V>() }
        let hash = getHash(key.hashCode())
        let index = getIndex(hash, buckets.size)
        var bucket = buckets[index]
        var pre = -1
        while (bucket >= 0) {
            if (hash == entries[bucket].hash && key == entries[bucket].key) {
                // Remove the node from the double linked list
                unlinkNode(bucket)
                
                if (pre < 0) {
                    buckets[index] = entries[bucket].next
                } else {
                    let temp = entries[pre]
                    entries[pre] = TinyLinkedHashMapEntry<K, V>(temp.hash, entries[bucket].next, temp.key, temp.value)
                }
                let removeEnt = entries[bucket].value
                entries[bucket] = TinyLinkedHashMapEntry<K, V>(-1, freeIndex, NULL_KEY, NULL_VALUE)
                // Reset the links of the removed node
                before[bucket] = -1
                after[bucket] = -1
                freeIndex = bucket
                freeSize++
                modCount++
                return removeEnt
            }
            pre = bucket
            bucket = entries[bucket].next
        }
        return None
    }

    /**
     * Transfer a lambda expression and delete the corresponding key value if the condition is met.
     *
     * @param predicate transfer a lambda expression for judgment.
     *
     * @since 0.18.4
     */
    @Frozen
    @OverflowWrapping
    public func removeIf(predicate: (K, V) -> Bool): Unit {
        let NULL_KEY = unsafe { zeroValue<K>() }
        let NULL_VALUE = unsafe { zeroValue<V>() }
        var lockVersion = modCount
        for (i in 0..buckets.size where buckets[i] != -1) {
            var next = buckets[i]
            var pre = -1
            while (next >= 0) {
                let item = entries[next]
                if (predicate(item.key, item.value)) {
                    if (lockVersion != modCount) {
                        throw Exception("The predicate cannot contain a modify operation.")
                    }
                    // Remove the node from the double linked list
                    unlinkNode(next)
                    
                    if (pre < 0) {
                        buckets[i] = item.next
                    } else {
                        let temp = entries[pre]
                        entries[pre] = TinyLinkedHashMapEntry<K, V>(temp.hash, item.next, temp.key, temp.value)
                    }
                    entries[next] = TinyLinkedHashMapEntry<K, V>(-1, freeIndex, NULL_KEY, NULL_VALUE)
                    // Reset the links of the removed node
                    before[next] = -1
                    after[next] = -1
                    freeIndex = next
                    freeSize++
                    modCount++
                    lockVersion++
                } else {
                    if (lockVersion != modCount) {
                        throw Exception("The predicate cannot contain a modify operation.")
                    }
                    pre = next
                }
                next = item.next
            }
        }
    }

    /**
     * Clear all key-value pairs.
     *
     * @since 0.18.4
     */
    @Frozen
    @OverflowWrapping
    public func clear(): Unit {
        for (i in 0..entries.size where entries[i].hash >= 0) {
            entries[i] = TinyLinkedHashMapEntry<K, V>()
            before[i] = -1
            after[i] = -1
        }

        for (i in 0..buckets.size where buckets[i] != -1) {
            buckets[i] = -1
        }

        modCount++
        freeIndex = -1
        appendIndex = 0
        freeSize = 0
        // Reset the head and tail pointers of the list
        head = -1
        tail = -1
    }

    /**
     * Returns the capacity of the hashmap.
     * The return value is the size of the array, not the size of the elements that can be accommodated.
     *
     * @return the capacity of the hashmap.
     *
     * @since 0.18.4
     */
    @Frozen
    public prop capacity: Int64 {
        get() {
            return entries.size
        }
    }

    /**
     * Checks whether the mapping relationship corresponding to the specified key exists in this mapping.
     *
     * @param key transfer the key to be judged.
     * @return bool returns true if exists; otherwise, false.
     *
     * @since 0.18.4
     */
    @Frozen
    public func contains(key: K): Bool {
        if (appendIndex - freeSize == 0) {
            return false
        }
        let hash = getHash(key.hashCode())
        let index = getIndex(hash, buckets.size)
        var bucket = buckets[index]
        while (bucket >= 0) {
            if (hash == entries[bucket].hash && key == entries[bucket].key) {
                return true
            }
            bucket = entries[bucket].next
        }
        return false
    }

    /**
     * An exception is reported when the get operator is overloaded and the key does not exist.
     *
     * @param key transfer the value for judgment.
     * @return the value corresponding to the key.
     *
     * @throws NoneValueException if value does not exist.
     *
     * @since 0.18.4
     */
    @Frozen
    public operator func [](key: K): V {
        return match (get(key)) {
            case None => throw NoneValueException("Value does not exist!\n")
            case Some(val) => val
        }
    }

    /**
     * The operator overloads the set. If the key does not exist, an exception is reported.
     *
     * @param key transfer the value for judgment.
     * @param value transfer the value to be set.
     *
     * @since 0.18.4
     */
    @Frozen
    public operator func [](key: K, value!: V): Unit {
        add(key, value)
    }

    /*
     * Transfer the key to obtain the k index.
     *
     * @param hash transfer the value for judgment.
     * @param size transfer the value for judgment.
     *
     * @return the k index corresponding to the key.
     *
     * @since 0.18.4
     */
    @Frozen
    @OverflowWrapping
    func getIndex(hash: Int64, size: Int64): Int64 {
        return hash & (size - 1)
    }

    /*
     * Transfer the key to obtain the hash value.
     *
     * @param key transfer the value for judgment.
     * @return the hash value corresponding to the key.
     *
     * @since 0.18.4
     */
    @Frozen
    @OverflowWrapping
    private func getHash(hashCode: Int64): Int64 {
        hashCode ^ (hashCode >> 32)
    }

    /**
     * Returns sizes of key-value.
     *
     * @return sizes of key-value.
     *
     * @since 0.18.4
     */
    @Frozen
    public prop size: Int64 {
        get() {
            return appendIndex - freeSize
        }
    }

    /**
     * Check whether the size is empty. If yes, true is returned. Otherwise, false is returned.
     *
     * @return bool if yes, true is returned. Otherwise, false is returned.
     *
     * @since 0.18.4
     */
    @Frozen
    public func isEmpty(): Bool {
        return (appendIndex - freeSize) == 0
    }

    /**
     * Obtaining the Version Number.
     *
     * @return the modCount about technology.
     *
     * @since 0.18.4
     */
    @Frozen
    func version(): Int64 {
        return modCount
    }

    @Frozen
    private func max(l: Int64, r: Int64): Int64 {
        return if (l >= r) {
            l
        } else {
            r
        }
    }

    /*
     * Initializes or doubles the table size.
     * If empty, the allocation is based on the initial DEFAULT_CAPACITY target reserved in the field threshold.
     *
     * @return a TreeNode encapsulated with option after expansion.
     *
     * @since 0.18.4
     */
    @Frozen
    @OverflowWrapping
    func resize(argCap: Int64): Bool {
        var isRehash = false
        let oldBucketsSize = buckets.size
        let allowedBucketSize = Int64(Float32(oldBucketsSize) * LOAD_FACTOR)

        // Except for reserve, following two if condition would not be satisfied at the same time.
        if (argCap >= allowedBucketSize) {
            let newCapOfBuckets = max(oldBucketsSize << 1, tableSizeFor(argCap))
            let newBuckets = Array<Int64>(newCapOfBuckets, repeat: -1)
            for (i in 0..entries.size) {
                if (entries[i].hash >= 0) {
                    let bucket = getIndex(entries[i].hash, newCapOfBuckets)
                    entries[i] = TinyLinkedHashMapEntry<K, V>(entries[i].hash, newBuckets[bucket], entries[i].key,
                        entries[i].value)
                    newBuckets[bucket] = i
                }
            }
            buckets = newBuckets
            isRehash = true
        }
        if (argCap > entries.size) {
            let oldEntriesSize = entries.size
            let newCapOfEntries = max(oldEntriesSize + (oldEntriesSize >> 1), argCap)
            
            // Expand the entries array
            let newEntries = Array<TinyLinkedHashMapEntry<K, V>>(
                newCapOfEntries,
                repeat: TinyLinkedHashMapEntry<K, V>()
            )
            entries.copyTo(newEntries, 0, 0, oldEntriesSize)
            entries = newEntries
            
            // Expand the before array
            let newBefore = Array<Int64>(newCapOfEntries, repeat: -1)
            before.copyTo(newBefore, 0, 0, oldEntriesSize)
            before = newBefore
            
            // Expand the after array
            let newAfter = Array<Int64>(newCapOfEntries, repeat: -1)
            after.copyTo(newAfter, 0, 0, oldEntriesSize)
            after = newAfter
        }
        return isRehash
    }

    /*
     * Returns a power of two size for the given target capacity.
     *
     * @return target capacity.
     *
     * @since 0.18.4
     */
    @Frozen
    private static func tableSizeFor(cap: Int64): Int64 {
        if (cap <= DEFAULT_CAPACITY) {
            return DEFAULT_CAPACITY
        }

        if (cap < MAX_BUCKET_SIZE) {
            var n = cap - 1
            n |= n >> 1
            n |= n >> 2
            n |= n >> 4
            n |= n >> 8
            n |= n >> 16
            n |= n >> 32
            return n + 1
        } else {
            return MAX_BUCKET_SIZE
        }
    }

    @Frozen
    func removePosition(hash: Int64, pos: Int64): Unit {
        // Remove the node from the double linked list
        unlinkNode(pos)
        
        let index = getIndex(hash, buckets.size)
        var bucket = buckets[index]
        var pre = -1
        while (bucket != pos) {
            pre = bucket
            bucket = entries[bucket].next
        }
        if (pre < 0) {
            buckets[index] = entries[pos].next
        } else {
            entries[pre] = TinyLinkedHashMapEntry<K, V>(entries[pre].hash, entries[pos].next, entries[pre].key, entries[pre].value)
        }
        entries[pos] = TinyLinkedHashMapEntry<K, V>(-1, freeIndex, unsafe { zeroValue<K>() }, unsafe { zeroValue<V>() })
        // Reset the links of the removed node
        before[pos] = -1
        after[pos] = -1
        freeIndex = bucket
        freeSize++
        modCount++
    }
    
    /**
     * Link the node to the end of the list
     */
    @Frozen
    @OverflowWrapping
    protected func linkNodeLast(index: Int64): Unit {
        let p = tail
        before[index] = p
        after[index] = -1
        tail = index
        
        if (p == -1) {
            // The first node
            head = index
        } else {
            // Link to the previous node
            after[p] = index
        }
    }
    
    /**
     * Remove the node from the list
     */
    @Frozen
    protected func unlinkNode(index: Int64): Unit {
        let b = before[index]  // The previous node
        let a = after[index]   // The next node
        
        // Reset the links of the current node
        before[index] = -1
        after[index] = -1
        
        // Update the successor pointer of the previous node
        if (b == -1) {
            // The current node is the head node
            head = a
        } else {
            after[b] = a
        }
        
        // Update the predecessor pointer of the next node
        if (a == -1) {
            // The current node is the tail node
            tail = b
        } else {
            before[a] = b
        }
    }
    
    /**
     * remove and return the head node of the double linked list (the earliest inserted node)
     *
     * @return the value of the removed head node, return None if the list is empty
     */
    @Frozen
    @OverflowWrapping
    public func removeFirst(): ?V {
        // Check if the list is empty
        if (head == -1) {
            return None
        }
        
        // Save the information of the head node
        let firstIndex = head
        let firstEntry = entries[firstIndex]
        let hash = firstEntry.hash
        let value = firstEntry.value
        
        // Remove the head node
        removePosition(hash, firstIndex)
        
        return value
    }
    
    /**
     * remove and return the tail node of the double linked list (the most recently inserted node)
     *
     * @return the value of the removed tail node, return None if the list is empty
     */
    @Frozen
    @OverflowWrapping
    public func removeLast(): ?V {
        // Check if the list is empty
        if (tail == -1) {
            return None
        }
        
        // Save the information of the tail node
        let lastIndex = tail
        let lastEntry = entries[lastIndex]
        let hash = lastEntry.hash
        let value = lastEntry.value
        
        // Remove the tail node
        removePosition(hash, lastIndex)
        
        return value
    }
}
