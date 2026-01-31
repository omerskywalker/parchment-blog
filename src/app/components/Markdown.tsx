"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  content: string;
};

function isExternalHref(href?: string) {
  if (!href) return false;
  return href.startsWith("http://") || href.startsWith("https://");
}

export default function Markdown({ content }: Props) {
  return (
    <div
      className={[
        "prose prose-invert max-w-none",
        "prose-p:leading-7",
        "prose-a:text-white prose-a:underline prose-a:decoration-white/30 hover:prose-a:decoration-white/60",
        "prose-strong:text-white",
        "prose-blockquote:border-l-white/20 prose-blockquote:text-white/80",
        "prose-hr:border-white/10",
        // lists can get tight in dark UI; a little extra readability:
        "prose-li:marker:text-white/30",
      ].join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a({ href, children, ...props }) {
            const external = isExternalHref(href);
            return (
              <a
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer noopener" : undefined}
                {...props}
              >
                {children}
              </a>
            );
          },

          // nake images behave in a "blog" way
          img({ alt, ...props }) {
            // react-markdown img props include src, etc.
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={alt ?? ""}
                className="my-6 w-full rounded-xl border border-white/10 bg-black/20"
                {...props}
              />
            );
          },

          // wrap wide tables
          table({ children, ...props }) {
            return (
              <div className="my-6 w-full overflow-x-auto">
                <table className="w-full border-collapse" {...props}>
                  {children}
                </table>
              </div>
            );
          },

          th({ children, ...props }) {
            return (
              <th
                className="border border-white/10 bg-white/5 px-3 py-2 text-left"
                {...props}
              >
                {children}
              </th>
            );
          },

          td({ children, ...props }) {
            return (
              <td className="border border-white/10 px-3 py-2" {...props}>
                {children}
              </td>
            );
          },

          // style <pre> directly so code blocks always scroll nicely
          pre({ children, ...props }) {
            return (
              <pre
                className="my-6 overflow-x-auto rounded-xl border border-white/10 bg-black/50 p-4"
                {...props}
              >
                {children}
              </pre>
            );
          },

          // inline code vs fenced code
          code({
            className,
            children,
            ...props
          }: React.ComponentPropsWithoutRef<"code">) {
            const isFenced =
              typeof className === "string" && className.includes("language-");

            if (!isFenced) {
              return (
                <code
                  className="rounded bg-white/10 px-1.5 py-0.5 text-[0.9em] text-white"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // trim trailing newline that react-markdown tends to include
            const text =
              typeof children === "string"
                ? children.replace(/\n$/, "")
                : String(children).replace(/\n$/, "");

            return (
              <code className={className} {...props}>
                {text}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
