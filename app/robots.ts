import type { MetadataRoute } from "next";
import { buildRobots } from "@/src/shared/seo/robots";

export default function robots(): MetadataRoute.Robots {
  return buildRobots();
}
