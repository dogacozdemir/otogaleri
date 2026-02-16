import { Helmet } from "react-helmet-async";

const SITE_URL = "https://akilligaleri.com";
const SITE_NAME = "Akıllı Galeri";
const DEFAULT_IMAGE = `${SITE_URL}/dashboard.png`;

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  canonicalUrl?: string;
  type?: "website" | "article";
  publishedTime?: string;
  author?: string;
  noIndex?: boolean;
}

export function SEO({
  title,
  description,
  image = DEFAULT_IMAGE,
  canonicalUrl,
  type = "website",
  publishedTime,
  author,
  noIndex = false,
}: SEOProps) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const fullImage = image.startsWith("http") ? image : `${SITE_URL}${image}`;
  const fullCanonical = canonicalUrl || `${SITE_URL}/`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={fullCanonical} />

      {/* Open Graph - Instagram/social friendly */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl || fullCanonical} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="tr_TR" />
      {type === "article" && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === "article" && author && (
        <meta property="article:author" content={author} />
      )}
    </Helmet>
  );
}
