interface QueuedOperation {
  id: string
  type: 'settings' | 'data'
  dataType?: string
  data: any
  timestamp: number
  retries: number
}

const QUEUE_STORAGE_KEY = 'mixId_offline_queue'
const MAX_RETRIES = 3

class OfflineQueue {
  private queue: QueuedOperation[] = []

  constructor() {
    this.loadQueue()
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY)
      if (stored) {
        this.queue = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Error loading offline queue:', error)
      this.queue = []
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue))
    } catch (error) {
      console.error('Error saving offline queue:', error)
    }
  }

  enqueue(type: 'settings' | 'data', data: any, dataType?: string): string {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const operation: QueuedOperation = {
      id,
      type,
      dataType,
      data,
      timestamp: Date.now(),
      retries: 0,
    }

    this.queue.push(operation)
    this.saveQueue()
    return id
  }

  async processQueue(processFn: (operation: QueuedOperation) => Promise<void>) {
    const operations = [...this.queue]
    
    for (const operation of operations) {
      try {
        await processFn(operation)
        this.remove(operation.id)
      } catch (error) {
        console.error(`Error processing queued operation ${operation.id}:`, error)
        operation.retries++
        
        if (operation.retries >= MAX_RETRIES) {
          console.warn(`Operation ${operation.id} exceeded max retries, removing from queue`)
          this.remove(operation.id)
        } else {
          this.saveQueue()
        }
      }
    }
  }

  remove(id: string) {
    this.queue = this.queue.filter((op) => op.id !== id)
    this.saveQueue()
  }

  clear() {
    this.queue = []
    this.saveQueue()
  }

  getQueue(): QueuedOperation[] {
    return [...this.queue]
  }

  getQueueSize(): number {
    return this.queue.length
  }
}

export const offlineQueue = new OfflineQueue()

