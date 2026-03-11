export class AsyncSemaphore {
  private availablePermits: number;
  private waitQueue: Array<(release: () => void) => void> = [];

  constructor(maxPermits: number) {
    if (maxPermits <= 0) throw new Error("maxPermits must be > 0");
    this.availablePermits = maxPermits;
  }

  async acquire(): Promise<() => void> {
    if (this.availablePermits > 0) {
      this.availablePermits -= 1;
      return this.createReleaseFunction();
    }

    return await new Promise<() => void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  private createReleaseFunction(): () => void {
    let released = false;

    return () => {
      if (released) return;
      released = true;

      const next = this.waitQueue.shift();
      if (next) {
        next(this.createReleaseFunction());
        return;
      }

      this.availablePermits += 1;
    };
  }
}
