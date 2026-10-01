import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";

const UPLOAD_DIR = path.resolve(process.env.ROOT_PATH ?? "", "public/uploads");
const MAX_OTA_SIZE = 4 * 1024 * 1024;

const POST = async (req: NextRequest) => {
  try {
    const formData = await req.formData();
    const file = formData.get("files");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ success: false, message: "No file uploaded" });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0 || buffer.length > MAX_OTA_SIZE) {
      return NextResponse.json(
        { success: false, message: "Firmware size is invalid for AMB82-MINI OTA" },
        { status: 400 }
      );
    }

    const marker = buffer
      .toString("latin1")
      .match(/AMB82_BUILD_ID=([A-Za-z0-9._-]{1,40})/);

    if (!marker) {
      return NextResponse.json(
        { success: false, message: "Firmware is not marked for AMB82-MINI" },
        { status: 400 }
      );
    }

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const filePath = path.resolve(UPLOAD_DIR, "ota.bin");
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
      name: "ota.bin",
      boardModel: "AMB82-MINI",
      buildId: marker[1],
      size: buffer.length,
      sha256: createHash("sha256").update(buffer).digest("hex"),
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ success: false, message: "File upload failed" });
  }
};

const DELETE = async (req: NextRequest) => {
  try {
    const filePath = path.resolve(UPLOAD_DIR, "ota.bin");

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return NextResponse.json({ success: true, message: "File deleted" });
    } else {
      return NextResponse.json({ success: false, message: "File not found" });
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json({
      success: false,
      message: "File deletion failed",
    });
  }
};

const GET = async (req: NextRequest) => {
  try {
    const filePath = path.resolve(UPLOAD_DIR, "ota.bin");

    if (fs.existsSync(filePath)) {
      const fileStats = fs.statSync(filePath);
      const fileContent = fs.readFileSync(filePath);
      const headers = new Headers();
      headers.append("Content-Disposition", `attachment; filename=ota.bin`);
      headers.append("Content-Type", "application/octet-stream");
      headers.append("Content-Length", fileStats.size.toString());

      const response = new NextResponse(fileContent, { headers });
      return response;
    } else {
      const response = NextResponse.json({
        success: false,
        message: "File not found",
      });
      return response;
    }
  } catch (error) {
    console.error("Error downloading file:", error);
    return NextResponse.json({
      success: false,
      message: "File download failed",
    });
  }
};

export { POST, DELETE, GET };
