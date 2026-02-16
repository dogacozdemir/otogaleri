/**
 * Build-time script: Generates sitemap.xml and robots.txt
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../public");
const blogPostsPath = path.join(__dirname, "../src/data/blog-posts.json");

const SITE_URL = "https://akilligaleri.com";

function generateSitemap() {
  const routes = [
    { url: "", changefreq: "weekly", priority: 1 },
    { url: "/blog", changefreq: "weekly", priority: 0.9 },
  ];

  if (fs.existsSync(blogPostsPath)) {
    const posts = JSON.parse(fs.readFileSync(blogPostsPath, "utf-8"));
    for (const post of posts) {
      routes.push({
        url: `/blog/${post.slug}`,
        changefreq: "monthly",
        priority: 0.8,
        lastmod: post.date,
      });
    }
  }

  const urls = routes
    .map(
      (r) => `  <url>
    <loc>${SITE_URL}${r.url || "/"}</loc>
    ${r.lastmod ? `<lastmod>${r.lastmod}</lastmod>` : ""}
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
    )
    .join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemap, "utf-8");
  console.log("Generated sitemap.xml");
}

function generateRobots() {
  const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

  fs.writeFileSync(path.join(publicDir, "robots.txt"), robots, "utf-8");
  console.log("Generated robots.txt");
}

generateSitemap();
generateRobots();
