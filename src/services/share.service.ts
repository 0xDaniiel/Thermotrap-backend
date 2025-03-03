import { Request, Response } from "express";
import QRCode from "qrcode";

export const generateShareLink = async (
  req: Request,
  res: Response
): Promise<void> => {
  const BASE_URL = "https://thermotrap.vercel.app";

  try {
    const { responseID } = req.params;
    const { type = "link" } = req.query;

    if (!responseID) {
      throw new Error("Form ID is required");
    }

    const shareUrl = `${BASE_URL}/f/${responseID}`;

    if (type === "qr") {
      const shareUrl = `thermotrap://f/${responseID}`;
      const qrCode = await QRCode.toDataURL(shareUrl);
      res.json({
        success: true,
        data: { qrCode, shareUrl },
      });
      return;
    }

    res.json({
      success: true,
      data: { shareUrl },
    });
    return;
  } catch (error) {
    console.error("Share link generation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate share link",
    });
  }
};
