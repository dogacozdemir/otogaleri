import { SITE_URL } from "@/lib/constants";

interface JsonLdProps {
  data: object | object[];
}

export function JsonLd({ data }: JsonLdProps) {
  const json = Array.isArray(data) ? data : [data];
  return (
    <>
      {json.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}

export function SoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Akıllı Galeri",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "KKTC galeri sektörü için çok para birimi (£, $, €, ₺, ¥) ile işlem ve takip, senetli satış ve gümrükleme odaklı SaaS çözümü.",
    offers: {
      "@type": "Offer",
      price: "99",
      priceCurrency: "GBP",
      priceValidUntil: "2026-12-31",
      availability: "https://schema.org/InStock",
    },
    url: SITE_URL,
  };
}

export function FAQPageSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function BlogPostingSchema(post: {
  title: string;
  description: string;
  date: string;
  author: string;
  image: string;
  canonicalUrl: string;
}) {
  const imageUrl = post.image.startsWith("http") ? post.image : `${SITE_URL}${post.image}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: {
      "@type": "Organization",
      name: post.author,
    },
    image: imageUrl,
    url: post.canonicalUrl,
    publisher: {
      "@type": "Organization",
      name: "Akıllı Galeri",
      url: SITE_URL,
    },
  };
}

export function BreadcrumbListSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
