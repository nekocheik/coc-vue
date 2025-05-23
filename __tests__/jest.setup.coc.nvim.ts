/*  __tests__/jest.setup.coc.nvim.ts
 *  Global stub for coc.nvim so that unit-tests never touch real Neovim APIs.
 */

const fakeNvim = {
  call: jest.fn(),
  command: jest.fn(),
  eval: jest.fn(),
  request: jest.fn(),
  createBuffer: jest.fn(),
  // add new stubs here as tests begin to need them
};

jest.mock('coc.nvim', () => ({
  workspace: {
    nvim: fakeNvim,
    // common workspace-level events used in code - stub with jest.fn()
    onDidChangeConfiguration: jest.fn(),
    onDidOpenTextDocument: jest.fn(),
    // ...extend only when necessary
  },
  // some modules import { Neovim } directly
  Neovim: jest.fn(() => fakeNvim),
}));

export { fakeNvim };  // optional helper for test-specific assertions
