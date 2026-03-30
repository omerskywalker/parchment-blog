"use client";

import * as React from "react";
import type { PublicPostCard } from "@/lib/server/public-posts";
import SearchBar from "./SearchBar";
import SearchFeed from "./SearchFeed";
import PublicPostsFeed from "./public-posts-feed";

type Props = {
  initialPosts: PublicPostCard[];
  initialCursor: string | null;
  tag?: string;
};

export default function PostsPageClient({ initialPosts, initialCursor, tag }: Props) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const isSearching = searchQuery.trim().length > 0;

  return (
    <>
      <div className="mt-4">
        <SearchBar onSearch={setSearchQuery} />
      </div>

      {isSearching ? (
        <SearchFeed query={searchQuery} />
      ) : (
        <PublicPostsFeed
          initialPosts={initialPosts}
          initialCursor={initialCursor}
          tag={tag}
          scope="posts"
        />
      )}
    </>
  );
}
