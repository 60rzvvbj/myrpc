import { Connection, RemoteProcedureCall } from "..";
import { sleep } from "../utils";

test("test 1", async () => {
  let client = new RemoteProcedureCall({
    port: 3001,
    callKeyMap: {
      test1: {
        host: "127.0.0.1",
        port: 4001,
      },
    },
    isEncryption: false,
  });

  let server = new RemoteProcedureCall({
    port: 4001,
    callKeyMap: {},
    isEncryption: false,
  });

  server.on("test1", (input) => {
    expect(input).toBe("input1");
    return "out1";
  });

  let res = await client.call("test1", "test1", "input1");
  expect(res).toBe("out1");

  client.distory();
  server.distory();
});

test("test 2", async () => {
  let client = new RemoteProcedureCall({
    port: 3002,
    callKeyMap: {
      test2: {
        host: "127.0.0.1",
        port: 4002,
      },
    },
    isEncryption: false,
  });

  let server = new RemoteProcedureCall({
    port: 4002,
    callKeyMap: {},
    isEncryption: false,
  });

  let now: string = "";
  let closeFlag = false;

  let conns: Connection;

  server.onConnect("test2", (connection) => {
    conns = connection;
    connection.onMessage = (msg: string) => {
      expect(msg).toBe(now);
    };
    connection.onClose = () => {
      expect(closeFlag).toBe(true);
    };
  });

  let conn = await client.connect("test2", "test2");
  conn.onMessage = (msg: string) => {
    expect(msg).toBe(now);
  };
  now = "111";
  conn.send(now);
  await sleep(100);
  now = "222";
  conn.send(now);
  await sleep(100);
  now = "333";
  conn.send(now);
  await sleep(100);

  now = "aaa";
  conns!.send(now);
  await sleep(100);
  now = "bbb";
  conns!.send(now);
  await sleep(100);
  now = "ccc";
  conns!.send(now);
  await sleep(100);
  conn.close();
  closeFlag = true;
  await sleep(100);

  client.distory();
  server.distory();
});
