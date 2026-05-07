import type { MetadataRoute } from "next";

const SITE_URL = process.env.SITE_URL || "https://arabicgames.directory";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/*/admin", "/*/update/", "/*/update-studio/", "/*/update-community/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
