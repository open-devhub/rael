import type { CommandCallbackOpts } from "../../types/command.ts";

export default {
  name: "ping",
  description: "Check the bot's latency and websocket ping",
  async execute({ client, message }: CommandCallbackOpts) {
    try {
      const ping = Date.now() - message.createdTimestamp;
      message.reply(`Pong! ${ping}ms | Websocket: ${client.ws.ping}ms`);
    } catch (err) {
      console.error(err);
    }
  },
};
