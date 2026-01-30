import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = { content: string };

export default function Markdown({ content }: Props) {
  return (
    <div className="prose prose-invert prose-p:text-white/80 prose-headings:text-white prose-a:text-white prose-strong:text-white max-w-none rounded-2xl border border-white/10 bg-black/40 p-6">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
