import type { Client } from "discord.js";

export default (client: Client) => {
  console.log(`${client?.user?.tag} is online.`);
};
