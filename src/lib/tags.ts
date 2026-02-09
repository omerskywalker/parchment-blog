export function parseTagsInput(input: string): string[] {
    // "btc,  money , Bitcoin , btc" -> ["btc","money","bitcoin"]
    const norm = input
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.toLowerCase());
  
    // de-dupe + keep order
    return Array.from(new Set(norm)).slice(0, 20);
  }
  
  export function formatTagsForInput(tags: string[] | null | undefined): string {
    return (tags ?? []).join(", ");
  }
  