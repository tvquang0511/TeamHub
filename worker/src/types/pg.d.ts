declare module 'pg' {
  export interface QueryResult<T = any> {
    rows: T[];
  }

  export interface PoolClient {
    query<T = any>(text: string, values?: any[]): Promise<QueryResult<T>>;
    release(): void;
  }

  export class Pool {
    constructor(config: { connectionString: string });
    connect(): Promise<PoolClient>;
  }
}
