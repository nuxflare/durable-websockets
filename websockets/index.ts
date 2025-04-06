import { DurableObject, WorkerEntrypoint } from "cloudflare:workers";

const MAX_MESSAGE_SIZE = 1024 * 10; // 10KB

interface ChatMessage {
  type: "chat";
  text: string;
}

interface NameUpdateMessage {
  type: "name";
  name: string;
}

type WebSocketMessage = ChatMessage | NameUpdateMessage;

// NOTE: in a real-world scenario, the token should instead be JWT or similar
// from which we could extract and validate room/user/topic and such
// or, the info can even be stored inside a KV
function extractRoomAndUser(request: Request): {
  room: string;
  userId: string;
} {
  const protocolHeader = request.headers.get("sec-websocket-protocol");
  if (!protocolHeader) {
    throw new Error("Missing sec-websocket-protocol header");
  }
  const [encoded] = protocolHeader.split(",").map((x) => x.trim());
  if (!encoded) {
    throw new Error("Invalid sec-websocket-protocol format");
  }
  const decoded = Buffer.from(encoded, "base64").toString("utf-8");
  const [room, userId] = decoded.split(":");
  if (!room || !userId) {
    throw new Error("Room and User ID must be separated by a colon");
  }
  return { room, userId };
}

export default class Worker extends WorkerEntrypoint {
  async publish(room: string, data: any) {
    const binding = (this.env as any)
      .WEBSOCKETS as DurableObjectNamespace<WebSockets>;
    const stub = binding.get(binding.idFromName(room)); // infer durable object instance from room name
    await stub.publish(room, data);
    return new Response(null);
  }
  override async fetch(request: Request) {
    const binding = (this.env as any)
      .WEBSOCKETS as DurableObjectNamespace<WebSockets>;
    try {
      const { room } = extractRoomAndUser(request);
      const stub = binding.get(binding.idFromName(room)); // infer durable object instance from room name
      return stub.fetch(request);
    } catch (err) {
      console.error("Error in worker fetch:", err);
      return new Response(null, { status: 400 });
    }
  }
}

export class WebSockets extends DurableObject {
  async publish(room: string, data: any) {
    try {
      const websockets = this.ctx.getWebSockets();
      if (websockets.length < 1) {
        return;
      }
      for (const ws of websockets) {
        const state = ws.deserializeAttachment() || {};
        if (state.room === room) {
          ws.send(JSON.stringify(data));
        }
      }
      return null;
    } catch (err) {
      console.error("publish err", err);
    }
  }
  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get("upgrade") === "websocket") {
      try {
        const { room, userId } = extractRoomAndUser(request);
        const protocols =
          request.headers
            .get("sec-websocket-protocol")
            ?.split(",")
            .map((x) => x.trim()) || [];
        protocols.shift(); // remove the room:userId from protocols

        const webSocketPair = new WebSocketPair();
        const [client, server] = Object.values(webSocketPair);
        if (server) {
          server.serializeAttachment({
            room,
            userId,
          });
          this.ctx.acceptWebSocket(server, [room, userId]);
        }

        const res = new Response(null, { status: 101, webSocket: client });
        if (protocols.length > 0) {
          res.headers.set("sec-websocket-protocol", protocols[0] as string);
        }
        return res;
      } catch (err) {
        console.error("Error in websocket fetch:", err);
        return new Response(null, { status: 400 });
      }
    }
    return new Response(null);
  }
  override async webSocketMessage(
    ws: WebSocket,
    message: ArrayBuffer | string,
  ) {
    const { room, userId } = ws.deserializeAttachment();

    // Validate message type and size
    if (typeof message !== "string") {
      console.error(`Invalid message type: ${typeof message}`);
      ws.close(1003, "Invalid message type");
      return;
    }
    if (message.length > MAX_MESSAGE_SIZE) {
      console.error(`Message too large: ${message.length} bytes`);
      ws.close(1009, "Message too large");
      return;
    }

    try {
      const parsed = JSON.parse(message) as WebSocketMessage;

      if (parsed.type === "chat") {
        if (
          typeof parsed.text !== "string" ||
          parsed.text.trim().length === 0
        ) {
          throw new Error("Invalid chat message");
        }
        const userName =
          (await this.ctx.storage.get<string>(`name:${userId}`)) || userId;
        this.publish(room, {
          type: "chat",
          userId,
          userName,
          text: parsed.text,
          time: new Date().toISOString(),
        });
      } else if (parsed.type === "name") {
        if (
          typeof parsed.name !== "string" ||
          parsed.name.trim().length === 0
        ) {
          throw new Error("Invalid name");
        }
        await this.ctx.storage.put(`name:${userId}`, parsed.name.trim());
        this.publish(room, {
          type: "name",
          userId,
          name: parsed.name.trim(),
          time: new Date().toISOString(),
        });
      } else {
        throw new Error("Unknown message type");
      }
    } catch (err) {
      console.error("Message processing error:", err);
      ws.close(1003, "Invalid message format");
    }
  }
  override async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    _wasClean: boolean,
  ) {
    const { userId } = ws.deserializeAttachment();
    await this.ctx.storage.delete(`name:${userId}`);
    ws.close(code, reason);
  }
}
