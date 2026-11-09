/**
 * A First-In-First-Out (FIFO) Queue built using a Linked List.
 * Rule: enqueue, dequeue, peek, and size must all be O(1).
 * 
 * Why not an Array? array.shift() is O(n) because it has to re-index 
 * every remaining element. A linked list just updates pointers, making it O(1).
 */
export class WaitlistQueue {
  // Private fields prevent outside code from messing with the head/tail pointers.
  #head = null;
  #tail = null;
  #size = 0;

  // Each node holds a value and a pointer to the next node.
  #Node = class {
    constructor(value) {
      this.value = value;
      this.next = null;
    }
  };

  enqueue(value) {
    const newNode = new this.#Node(value);
    if (this.#tail === null) {
      // If the queue is empty, the new node is both the head and the tail.
      this.#head = newNode;
      this.#tail = newNode;
    } else {
      // Otherwise, attach it to the end and update the tail pointer.
      this.#tail.next = newNode;
      this.#tail = newNode;
    }
    this.#size++;
  }

  dequeue() {
    if (this.#head === null) return undefined; // Empty queue
    
    const removedValue = this.#head.value;
    this.#head = this.#head.next; // Move head to the next person in line.
    
    // If the queue is now empty, make sure the tail is also null.
    if (this.#head === null) {
      this.#tail = null;
    }
    
    this.#size--;
    return removedValue;
  }

  peek() {
    if (this.#head === null) return undefined;
    return this.#head.value; // O(1) lookup
  }

  get size() {
    return this.#size; // O(1) lookup because we track it manually
  }
}