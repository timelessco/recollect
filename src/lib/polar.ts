import { Polar } from "@polar-sh/sdk";

const server = process.env.POLAR_SERVER === "production" ? "production" : "sandbox";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
  server,
});
