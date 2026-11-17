import Anthropic from "@anthropic-ai/sdk";

// Photo analysis on the most capable tier can think for a while before writing.
export const maxDuration = 300;

const MODEL = "claude-opus-5-5";
const MAX_IMAGES = 10;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

const SYSTEM =
  "You are the modelling engine of HouseForge, an app that turns photographs of a home into a measured 3D model and a technical floor plan. " +
  "You estimate real dimensions from standard reference sizes (doors, windows, counters, furniture) and you always answer with exactly the JSON the user turn asks for, with no prose before or after it.";

// Marks an error that happens after text has started streaming. The client splits on it.
const ERROR_MARK = "\n[[HF_ERROR]]";

export async function GET(request: Request) {
  // Reading the request keeps this handler dynamic, so a key added later is seen.
  void request.headers;
  return Response.json({
    configured: Boolean(process.env.ANTHROPIC_API_KEY),
    model: MODEL,
    maxImages: MAX_IMAGES,
  });
}

function errorCode(e: unknown): { code: string; message: string } {
  if (e instanceof Anthropic.APIUserAbortError) return { code: "cancelled", message: "Stopped." };
  if (e instanceof Anthropic.AuthenticationError) return { code: "auth", message: "The Anthropic API key was rejected." };
  if (e instanceof Anthropic.PermissionDeniedError) return { code: "auth", message: "This API key cannot use the model." };
  if (e instanceof Anthropic.RateLimitError) return { code: "rate_limited", message: "Rate limited by the Anthropic API." };
  if (e instanceof Anthropic.BadRequestError) return { code: "bad_request", message: e.message };
  if (e instanceof Anthropic.APIError) return { code: "upstream_error", message: `Anthropic API error ${e.status ?? ""}`.trim() };
  if (e instanceof Anthropic.APIConnectionError) return { code: "upstream_error", message: "Could not reach the Anthropic API." };
  return { code: "upstream_error", message: e instanceof Error ? e.message : "Unknown error" };
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ code: "bad_request", message: "Expected multipart form data." }, { status: 400 });
  }
  const prompt = String(form.get("prompt") ?? "").trim();
  const task = String(form.get("task") ?? "edit");
  const files = form.getAll("images").filter((f): f is File => f instanceof File);
  if (!prompt) return Response.json({ code: "bad_request", message: "Missing prompt." }, { status: 400 });
  if (files.length > MAX_IMAGES)
    return Response.json({ code: "image_rejected", message: `At most ${MAX_IMAGES} photos per pass.` }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY || request.headers.get("x-anthropic-key") || "";
  if (!apiKey)
    return Response.json(
      { code: "no_key", message: "No Anthropic API key. Add yours with the API key button, or set ANTHROPIC_API_KEY on the server." },
      { status: 401 },
    );

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const [i, file] of files.entries()) {
    const type = (IMAGE_TYPES as readonly string[]).includes(file.type) ? (file.type as ImageType) : null;
    if (!type) return Response.json({ code: "image_rejected", message: `Photo ${i + 1} is not JPEG, PNG, WebP or GIF.` }, { status: 400 });
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    content.push({ type: "text", text: `Photo ${i + 1}:` });
    content.push({ type: "image", source: { type: "base64", media_type: type, data } });
  }
  content.push({ type: "text", text: prompt });

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const stream = client.beta.messages.stream(
        {
          model: MODEL,
          max_tokens: 64000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: task === "analyze" ? "high" : "medium" },
          system: SYSTEM,
          messages: [{ role: "user", content }],
        },
        { signal: request.signal },
      );
      stream.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
      try {
        const message = await stream.finalMessage();
        if (message.stop_reason === "refusal") {
          controller.enqueue(encoder.encode(ERROR_MARK + JSON.stringify({ code: "refused", message: "Claude declined this request." })));
        } else if (message.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode(ERROR_MARK + JSON.stringify({ code: "invalid_json", message: "The answer was cut short." })));
        }
      } catch (e) {
        try {
          controller.enqueue(encoder.encode(ERROR_MARK + JSON.stringify(errorCode(e))));
        } catch {
          // The browser already went away.
        }
      }
      try {
        controller.close();
      } catch {
        // Already closed by a cancelled request.
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
