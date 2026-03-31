import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.dimtale.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/v1/", "/scene-images/", "/play"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
