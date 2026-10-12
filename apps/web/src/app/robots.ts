import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/demo", "/feedback", "/docs/", "/security", "/proof"],
      disallow: ["/app/", "/auth/", "/payables/", "/verify/"],
    },
  };
}
