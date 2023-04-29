import * as net from "net";
import {
  ConnectServeHandler,
  Connection,
  RPC,
  RPCConfig,
  ServeHandler,
} from "./types";
import { getPromise } from "./utils";
import { CallInfo, LikeType, Request, Response } from "./private_type";

export * from "./types";

export class RemoteProcedureCall implements RPC {
  private config: RPCConfig;
  private shortLinkMap: { [name: string]: ServeHandler };
  private longLinkMap: { [name: string]: ConnectServeHandler };
  private server: net.Server;

  constructor(config: RPCConfig) {
    this.config = config;
    this.shortLinkMap = {};
    this.longLinkMap = {};
    this.server = net.createServer(this.serve.bind(this));
    this.server.listen(this.config.port);
  }

  distory() {
    this.server.close();
    this.shortLinkMap = {};
    this.longLinkMap = {};
  }

  private serve(socket: net.Socket) {
    const { shortLinkMap, longLinkMap } = this;
    async function fn(data: Buffer) {
      let callInfo: CallInfo = JSON.parse(data.toString());
      if (callInfo.type === LikeType.Short) {
        let info = callInfo as Request;
        let handler = shortLinkMap[callInfo.name];
        if (!handler) {
          socket.write(JSON.stringify({ flag: false, data: "" } as Response));
        }
        let res = await handler(info.input);
        socket.write(JSON.stringify({ flag: true, data: res } as Response));
      } else if (callInfo.type === LikeType.Long) {
        let handler = longLinkMap[callInfo.name];
        if (!handler) {
          socket.write(JSON.stringify({ flag: false, data: "" } as Response));
        }
        socket.write(JSON.stringify({ flag: true, data: "" } as Response));
        socket.off("data", fn);
        let connection = {
          send(msg: string) {
            socket.write(msg);
          },
          onMessage(msg: string) {},
          close() {
            socket.end();
          },
          onClose() {},
        } as Connection;
        socket.on("data", (d) => {
          connection.onMessage(d.toString());
        });
        socket.on("close", () => {
          connection.onClose();
        });
        handler(connection);
      } else {
        socket.write(JSON.stringify({ flag: false, data: "" } as Response));
      }
    }
    socket.on("data", fn);
  }

  on(name: string, handler: ServeHandler): boolean {
    this.shortLinkMap[name] = handler;
    return true;
  }

  close(name: string): boolean {
    if (!this.shortLinkMap[name] && !this.longLinkMap[name]) {
      return false;
    }
    if (this.shortLinkMap[name]) {
      delete this.shortLinkMap[name];
    } else {
      delete this.longLinkMap[name];
    }
    return true;
  }

  call(target: string, name: string, input: string): Promise<string> {
    const { config } = this;
    const callInfo = config.callKeyMap[target];
    if (!callInfo) {
      throw new Error("rpc call: target is not exist");
    }
    const [p, r] = getPromise<string>();
    const socket = net.createConnection(
      { host: callInfo.host, port: callInfo.port },
      () => {
        socket.write(
          JSON.stringify({
            type: LikeType.Short,
            name,
            input,
          } as Request)
        );
      }
    );
    socket.on("error", function (err) {
      throw err;
    });
    socket.on("data", (data) => {
      socket.end();
      let res: Response = JSON.parse(data.toString());
      if (!res.flag) {
        throw new Error("rpc call: target is offline");
      } else {
        r(res.data);
      }
    });
    return p;
  }

  onConnect(name: string, handler: ConnectServeHandler): boolean {
    this.longLinkMap[name] = handler;
    return true;
  }

  connect(target: string, name: string): Promise<Connection> {
    const { config } = this;
    const callInfo = config.callKeyMap[target];
    if (!callInfo) {
      throw new Error("rpc connect: target is not exist");
    }
    const [p, r] = getPromise<Connection>();
    const socket = net.createConnection(
      { host: callInfo.host, port: callInfo.port },
      async () => {
        socket.write(
          JSON.stringify({
            type: LikeType.Long,
            name: name,
          } as CallInfo)
        );

        await (() => {
          let [pp, rr] = getPromise<void>();
          let wait = (data: Buffer) => {
            let res: Response = JSON.parse(data.toString());
            if (res.flag) {
              socket.off("data", wait);
              rr();
            } else {
              throw new Error("rpc connect: error");
            }
          };
          socket.on("data", wait);
          return pp;
        })();

        let connection = {
          send(msg: string) {
            socket.write(msg);
          },
          onMessage(msg: string) {},
          close() {
            socket.end();
          },
          onClose() {},
        } as Connection;
        socket.on("error", function (err) {
          throw err;
        });
        socket.on("data", (data) => {
          connection.onMessage(data.toString());
        });
        socket.on("close", () => {
          connection.onClose();
        });
        r(connection);
      }
    );
    return p;
  }
}
