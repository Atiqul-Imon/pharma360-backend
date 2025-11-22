declare global {
  function describe(name: string, fn: () => void | Promise<void>): void;
  function it(name: string, fn: () => void | Promise<void>): void;
  const expect: any;
}

export {};

