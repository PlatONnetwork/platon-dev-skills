type UnknownRecord = Record<string, unknown>;

function extractObject(value: unknown): UnknownRecord | null {
  return value != null && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

export function getPaginationEnvelope(payload: unknown): { next_cursor: string | null; has_next: boolean } | undefined {
  const root = extractObject(payload);
  if (!root) return undefined;

  const pagination = extractObject(root.pagination);
  if (pagination && typeof pagination.cursor === "string") {
    return {
      next_cursor: pagination.cursor,
      has_next: Boolean(pagination.has_next),
    };
  }

  const nextPageParams = extractObject(root.next_page_params);
  if (nextPageParams) {
    return {
      next_cursor: JSON.stringify(nextPageParams),
      has_next: true,
    };
  }

  const items = Array.isArray(root.items) ? root.items : null;
  const nextPagePath = typeof root.next_page_path === "string" ? root.next_page_path : null;
  if (items || nextPagePath) {
    return {
      next_cursor: nextPagePath,
      has_next: Boolean(nextPagePath),
    };
  }

  return undefined;
}
