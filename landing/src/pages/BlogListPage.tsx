import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import blogPosts from "@/data/blog-posts.json";
import type { BlogPost } from "@/types/blog";

const posts = blogPosts as BlogPost[];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function BlogListPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <SEO
        title="Blog"
        description="KKTC otogaleri sektörü, araç ithalatı, gümrükleme ve çok para birimli muhasebe hakkında rehberler ve ipuçları."
        canonicalUrl="https://akilligaleri.com/blog"
      />
      <Header />
      <main className="pt-[calc(7rem+env(safe-area-inset-top))] pb-24">
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-4">
                Blog
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                KKTC galeri sektörü, araç ithalatı, gümrükleme ve çok para birimli
                muhasebe hakkında rehberler ve ipuçları.
              </p>
            </motion.div>

            <div className="grid gap-6 sm:gap-8">
              {posts.map((post, i) => (
                <BlogCard key={post.slug} post={post} index={i} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function BlogCard({
  post,
  index,
}: {
  post: BlogPost;
  index: number;
}) {
  const [imgError, setImgError] = useState(false);
  const showPlaceholder = !post.image || imgError;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 overflow-hidden hover:border-indigo-500/40 hover:shadow-lg transition-all duration-300"
    >
      <Link to={`/blog/${post.slug}`} className="block">
        <div className="flex flex-col sm:flex-row">
          <div className="sm:w-48 shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center aspect-video sm:aspect-square overflow-hidden">
            {showPlaceholder ? (
              <span className="text-4xl text-slate-400">📄</span>
            ) : (
              <img
                src={post.image}
                alt={post.title}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            )}
          </div>
          <div className="p-6 flex-1">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
              <Calendar className="h-4 w-4" aria-hidden />
              {formatDate(post.date)}
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-2">
              {post.title}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2 mb-4">
              {post.description}
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">
              Devamını oku
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
