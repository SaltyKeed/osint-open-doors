// Deliberately vulnerable route to prove that CodeQL blocks the merge. Never merge.
export async function GET(request: Request): Promise<Response> {
  const name = new URL(request.url).searchParams.get("name") ?? "";
  // Reflected XSS: user input written into HTML without escaping.
  return new Response(`<h1>Bonjour ${name}</h1>`, {
    headers: { "Content-Type": "text/html" },
  });
}
