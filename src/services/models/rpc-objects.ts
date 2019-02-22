export interface JSONRPCError {
  code: number;
  message: string;
}

export interface JSONRPCRequest {
  jsonrpc: string;
  method: string;
  id: string;
  params: string[];
}

export interface JSONRPCResponse {
  jsonrpc: string;
  result: any;
  id: string;
}

export interface JSONRPCErrorResponse {
  jsonrpc: string;
  error: JSONRPCError;
  message?: string;
  id: string | null;
}
