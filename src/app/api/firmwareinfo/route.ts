import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UPLOAD_PATH = path.resolve(
  process.env.ROOT_PATH ?? "",
  "public/uploads/ota.bin"
);

const GET = async () => {
  try {
    if (!fs.existsSync(UPLOAD_PATH)) {
      return NextResponse.json(
        { available: false },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const firmware = fs.readFileSync(UPLOAD_PATH);
    const marker = firmware
      .toString("latin1")
      .match(/AMB82_BUILD_ID=([A-Za-z0-9._-]{1,40})/);

    return NextResponse.json(
      {
        available: true,
        boardModel: "AMB82-MINI",
        buildId: marker?.[1] ?? "UNKNOWN",
        size: firmware.length,
        sha256: createHash("sha256").update(firmware).digest("hex"),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { available: false, error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
};

export { GET };
