import { ActivityType } from "discord.js";

export default (client) => {
  client.user.setPresence({
    activities: [
      {
        name: "Human conversations",
        type: ActivityType.Listening,
      },
    ],
    status: "online",
  });
};
