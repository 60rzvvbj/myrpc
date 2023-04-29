export interface Connection {
  send(msg: string): void;
  onMessage(msg: string): void;
  close(): void;
  onClose(): void;
}

export interface RPCConfig {
  port: number;
  isEncryption: boolean;
  callKeyMap: {
    [key: string]: {
      host: string;
      port: number;
    };
  };
}

export type ServeHandler = (input: string) => Promise<string> | string;
export type ConnectServeHandler = (connection: Connection) => void;

export interface RPC {
  /**
   * 启动短链接口
   * @param name 接口名
   * @param handler 接口处理函数
   * @returns 是否成功
   */
  on(name: string, handler: ServeHandler): boolean;

  /**
   * 取消接口的监听
   * @param name 接口名
   * @returns 是否成功
   */
  close(name: string): boolean;

  /**
   * 调用接口
   * @param target 目标
   * @param name 接口名
   * @param input 参数
   * @returns 返回值
   */
  call(target: string, name: string, input: string): Promise<string>;

  /**
   * 启动长链接口
   * @param name 接口名
   * @param handler 接口处理函数
   */
  onConnect(name: string, handler: ConnectServeHandler): boolean;

  /**
   * 连接长链
   * @param target 目标
   * @param name 接口名
   * @returns 连接器
   */
  connect(target: string, name: string): Promise<Connection>;
}
