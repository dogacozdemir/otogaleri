import { useParams, Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, User, ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import {
  JsonLd,
  BlogPostingSchema,
  BreadcrumbListSchema,
} from "@/components/JsonLd";
import blogPosts from "@/data/blog-posts.json";
import type { BlogPost } from "@/types/blog";
import { SITE_URL } from "@/lib/constants";

const posts = blogPosts as BlogPost[];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = posts.find((p) => p.slug === slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const breadcrumbs = [
    { name: "Ana Sayfa", url: SITE_URL },
    { name: "Blog", url: `${SITE_URL}/blog` },
    { name: post.title, url: post.canonicalUrl },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <SEO
        title={post.title}
        description={post.description}
        image={post.image}
        canonicalUrl={post.canonicalUrl}
        type="article"
        publishedTime={post.date}
        author={post.author}
      />
      <JsonLd
        data={[
          BlogPostingSchema(post),
          BreadcrumbListSchema(breadcrumbs),
        ]}
      />
      <Header />
      <main className="pt-[calc(7rem+env(safe-area-inset-top))] pb-24">
        <article className="py-12 px-4">
          <div className="max-w-3xl mx-auto">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-8 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Blog'a dön
            </Link>

            <motion.header
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-4">
                {post.title}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" aria-hidden />
                  {formatDate(post.date)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <User className="h-4 w-4" aria-hidden />
                  {post.author}
                </span>
              </div>
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-indigo-100 dark:bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </motion.header>

            {post.image && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-8 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800"
              >
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full aspect-video object-cover"
                />
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-indigo-600 dark:prose-a:text-indigo-400"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
