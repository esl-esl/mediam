export function getUserId(request: Request) {
  return (
    request.headers.get("oai-authenticated-user-id") ||
    request.headers.get("oai-authenticated-user-email") ||
    "local-owner"
  );
}

export function getDisplayName(request: Request) {
  const encoded = request.headers.get("oai-authenticated-user-full-name");
  const encoding = request.headers.get("oai-authenticated-user-full-name-encoding");
  if (encoded && encoding === "percent-encoded-utf-8") {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return null;
    }
  }
  return request.headers.get("oai-authenticated-user-email");
}
