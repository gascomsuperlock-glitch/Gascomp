import QRCode from "qrcode";

/** Render the same branded PNG for the preview and download. */
export async function generateBrandedQr(productUrl: string): Promise<string> {
  const logo = new Image();
  logo.src = "/gascomp-logo.png";
  await logo.decode();

  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, productUrl, {
    width: 640,
    margin: 4,
    color: { dark: "#2c3038", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create the QR canvas.");

  // Keep the wide wordmark proportional and the covered area shallow.
  const width = canvas.width * 0.26;
  const height = width * (logo.naturalHeight / logo.naturalWidth);
  const padding = canvas.width * 0.0125;
  const x = (canvas.width - width) / 2;
  const y = (canvas.height - height) / 2;
  context.fillStyle = "#ffffff";
  context.fillRect(x - padding, y - padding, width + padding * 2, height + padding * 2);
  context.drawImage(logo, x, y, width, height);

  return canvas.toDataURL("image/png");
}
