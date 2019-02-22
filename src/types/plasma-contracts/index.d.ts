declare module 'plasma-contracts' {
  namespace compiledContracts {
    interface CompiledContract {
      abi: any[];
      bytecode: string;
    }

    const plasmaChainCompiled: CompiledContract;
    const erc20Compiled: CompiledContract;
    const plasmaRegistryCompiled: CompiledContract;
  }
}
