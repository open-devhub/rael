import type { Client, Message } from "discord.js";

export type CommandCallbackOpts = {
  client: Client;
  message: Message;
  prefix: string;
  args: string[];
  ctx: any;
};

export type SubcommandCallbackOpts = CommandCallbackOpts;
