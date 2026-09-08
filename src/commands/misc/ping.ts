import type { CommandCallbackOpts } from "../../types/command.ts";

export default {
  name: "ping",
  description: "Check the bot's latency and WebSocket ping",
  async execute({ client, message }: CommandCallbackOpts) {
    try {
      const ping = Date.now() - message.createdTimestamp;
      await message.reply(`Pong! ${ping}ms | WebSocket: ${client.ws.ping}ms`);
    } catch (err) {
      console.error(err);
    }
  },
};
