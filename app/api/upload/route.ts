import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const session = await auth();

        if (!session?.user?.id) {
          throw new Error("Unauthorized");
        }

        const variant =
          clientPayload === "cover"
            ? "cover"
            : clientPayload === "response"
              ? "response"
              : "profile";

        if (variant === "cover") {
          // Coarse gate: any church member can upload covers (they need them for
          // event/series creation). Specific event permission is enforced by the
          // action that saves the URL. JWT memberships used intentionally here —
          // this is a UI-level upload gate, not a capability-based auth decision.
          const memberships = session.user.churchMemberships ?? [];
          if (!session.user.isPlatformAdmin && memberships.length === 0) {
            throw new Error("Forbidden");
          }
        }

        return {
          allowedContentTypes:
            variant === "response"
              ? [
                  "image/jpeg",
                  "image/png",
                  "image/webp",
                  "image/gif",
                  "image/avif",
                  "application/pdf",
                  "application/msword",
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ]
              : [
                  "image/jpeg",
                  "image/png",
                  "image/webp",
                  "image/gif",
                  "image/avif",
                ],
          maximumSizeInBytes:
            variant === "response" ? 10 * 1024 * 1024 : 4 * 1024 * 1024,
          tokenPayload: JSON.stringify({
            userId: session.user.id,
            variant,
          }),
        };
      },
      onUploadCompleted: async () => {
        // URL is returned to the client and saved via the form's onChange
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = (error as Error).message;
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
