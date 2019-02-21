declare module 'eth-lib' {
  namespace Account {
    interface Account {
      address: string;
      privateKey: string;
    }

    function fromPrivate(key: string): Account;
    function create(entropy?: string): Account;
    function sign(hash: string, privateKey: string): string;
  }
}
