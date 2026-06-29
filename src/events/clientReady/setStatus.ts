import { ActivityType, Client } from "discord.js";

let presenceInterval: NodeJS.Timeout | null = null;

export default (client: Client) => {
  const setPresence = () => {
    if (!client.user) return;

    client.user.setPresence({
      activities: [
        {
          name: "@ping me",
          type: ActivityType.Listening,
        },
      ],
      status: "online",
    });
  };

  setPresence();

  if (presenceInterval) {
    clearInterval(presenceInterval);
  }

  presenceInterval = setInterval(setPresence, 60 * 60 * 1000);
};
