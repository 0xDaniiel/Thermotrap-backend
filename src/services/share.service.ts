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

    const shareUrl = `${BASE_URL}/submission/singlesubmission/${responseID}`;

    if (type === "qr") {
      const shareUrl = `thermotrap://submission/singlesubmission/${responseID}`;
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

export const generateShareLinks = async (
  req: Request,
  res: Response
): Promise<void> => {
  const BASE_URL = "https://thermotrap.vercel.app";

  try {
    const { responseIDs } = req.body;
    const { type = "link" } = req.query;

    if (!Array.isArray(responseIDs) || responseIDs.length === 0) {
      throw new Error("responseIDs must be a non-empty array");
    }

    const shareLinks = await Promise.all(
      responseIDs.map(async (responseID) => {
        const shareUrl = `${BASE_URL}/submission/singlesubmission/${responseID}`;

        if (type === "qr") {
          const qrShareUrl = `thermotrap://submission/singlesubmission/${responseID}`;
          const qrCode = await QRCode.toDataURL(qrShareUrl);
          return { responseID, qrCode, shareUrl: qrShareUrl };
        }

        return { responseID, shareUrl };
      })
    );

    res.json({
      success: true,
      data: shareLinks,
    });
  } catch (error) {
    console.error("Share link generation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate share links",
    });
  }
};
