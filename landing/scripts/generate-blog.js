/**
 * Build-time script: Reads Markdown files from content/blog/,
 * parses frontmatter, converts to HTML, outputs JSON for the app.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import { marked } from "marked";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.join(__dirname, "../content/blog");
const outputPath = path.join(__dirname, "../src/data/blog-posts.json");

const SITE_URL = "https://akilligaleri.com";

function getSlug(filename) {
  return path.basename(filename, ".md");
}

function generateBlogPosts() {
  const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".md"));
  const posts = [];

  for (const file of files) {
    const filePath = path.join(contentDir, file);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data: frontmatter, content } = matter(raw);
    const slug = getSlug(file);

    const html = marked.parse(content, { gfm: true });

    posts.push({
      slug,
      title: frontmatter.title || "Başlıksız",
      description: frontmatter.description || "",
      date: frontmatter.date || "",
      author: frontmatter.author || "Akıllı Galeri",
      image: frontmatter.image || "",
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
      canonicalUrl: frontmatter.canonicalUrl || `${SITE_URL}/blog/${slug}`,
      content: html,
    });
  }

  // Sort by date descending
  posts.sort((a, b) => (b.date > a.date ? 1 : -1));

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(posts, null, 2), "utf-8");
  console.log(`Generated ${posts.length} blog posts → ${outputPath}`);
}

generateBlogPosts();
