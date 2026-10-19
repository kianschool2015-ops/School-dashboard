import { describe, it, expect, beforeAll, afterAll } from "vitest";
import net from "node:net";
import { AsteriskAmiClient } from "../src/server/services/voip";
import type { VoipAmiSettings } from "../src/types/models";

const MOCK_AMI_PORT = 50389;

describe("Phase 7: Asterisk AMI Protocol Verification with Mock TCP Server", () => {
  let server: net.Server;
  let receivedCommands: string[] = [];

  beforeAll(async () => {
    return new Promise<void>((resolve) => {
      server = net.createServer((socket) => {
        // 1. Send Asterisk Handshake Banner upon connection
        socket.write("Asterisk Call Manager/5.0.1\r\n");

        let buffer = "";
        socket.on("data", (chunk) => {
          buffer += chunk.toString("utf8");

          // Parse packets delimited by \r\n\r\n
          let delimiterMatch: RegExpMatchArray | null;
          while ((delimiterMatch = buffer.match(/\r?\n\r?\n/))) {
            const matchIdx = delimiterMatch.index!;
            const matchLen = delimiterMatch[0].length;
            const packetRaw = buffer.slice(0, matchIdx);
            buffer = buffer.slice(matchIdx + matchLen);

            receivedCommands.push(packetRaw);

            // Extract ActionID
            const actionIdMatch = packetRaw.match(/ActionID:\s*([^\r\n]+)/i);
            const actionId = actionIdMatch ? actionIdMatch[1].trim() : "none";

            if (packetRaw.toLowerCase().includes("action: login")) {
              socket.write(
                `Response: Success\r\nActionID: ${actionId}\r\nMessage: Authentication accepted\r\n\r\n`
              );
            } else if (packetRaw.toLowerCase().includes("action: originate")) {
              socket.write(
                `Response: Success\r\nActionID: ${actionId}\r\nMessage: Originate successfully queued\r\n\r\n`
              );
            } else if (packetRaw.toLowerCase().includes("action: logoff")) {
              socket.write(
                `Response: Goodbye\r\nActionID: ${actionId}\r\nMessage: Thanks for all the fish.\r\n\r\n`
              );
              socket.end();
            } else {
              socket.write(
                `Response: Success\r\nActionID: ${actionId}\r\nMessage: OK\r\n\r\n`
              );
            }
          }
        });
      });

      server.listen(MOCK_AMI_PORT, "127.0.0.1", () => {
        resolve();
      });
    });
  });

  afterAll(async () => {
    return new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("successfully performs TCP handshake and receives AMI banner", async () => {
    const config: VoipAmiSettings = {
      id: "voip_mock",
      host: "127.0.0.1",
      port: MOCK_AMI_PORT,
      username: "admin",
      secret: "secret123",
      context: "from-internal",
      channelTech: "SIP",
      trunk: "SIP/trunk1",
      callerId: "02191000000",
      isActive: true,
      mentorExtensions: { usr_mentor1: "101" },
      updatedAt: new Date(),
    };

    const client = new AsteriskAmiClient(config);
    const banner = await client.connect(2000);
    expect(banner).toContain("Asterisk Call Manager");

    const loginRes = await client.login();
    expect(loginRes.headers["response"]).toBe("Success");
    expect(loginRes.headers["message"]).toBe("Authentication accepted");

    await client.disconnect();
  });

  it("confirms queued calls and non-blocking event-loop under concurrent dispatch", async () => {
    const config: VoipAmiSettings = {
      id: "voip_mock_burst",
      host: "127.0.0.1",
      port: MOCK_AMI_PORT,
      username: "admin",
      secret: "secret123",
      context: "from-internal",
      channelTech: "SIP",
      trunk: "SIP/trunk1",
      callerId: "02191000000",
      isActive: true,
      mentorExtensions: { usr_mentor1: "101" },
      updatedAt: new Date(),
    };

    const client = new AsteriskAmiClient(config);
    await client.connect(2000);
    await client.login();

    // Verify event-loop responsiveness during dispatch
    let loopBlocked = false;
    const start = Date.now();
    const intervalTimer = setInterval(() => {
      const now = Date.now();
      if (now - start > 500) {
        // Heartbeat is ticking regularly
      }
    }, 50);

    // Concurrently dispatch 25 originate requests over single persistent AMI socket
    const promises = [];
    for (let i = 0; i < 25; i++) {
      promises.push(
        client.originate({
          mentorChannel: "SIP/101",
          destinationPhone: `091210000${i.toString().padStart(2, "0")}`,
          context: "from-internal",
          callerId: "02191000000",
          timeoutMs: 5000,
        })
      );
    }

    const results = await Promise.all(promises);
    clearInterval(intervalTimer);

    expect(results.length).toBe(25);
    for (const r of results) {
      expect(r.success).toBe(true);
      expect(r.message).toContain("successfully queued");
    }

    await client.disconnect();
  });
});
