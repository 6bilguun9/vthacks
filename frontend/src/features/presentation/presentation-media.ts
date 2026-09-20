// Direct local files keep presentation images independent of the image optimizer.
// The portable exporter replaces these URLs with embedded copies of these files.
export const presentationMedia = {
  campus: "/campus/origami.png",
  finbot: "/finbot/team-logo.png",
  overview: "/presentation/overview.jpg",
  dining: "/presentation/dining.jpg",
} as const;

export const presentationAppUrl = "/";
