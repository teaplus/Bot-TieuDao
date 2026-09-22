import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const CARD_H = 200;
const GAP_X = 20;
const GAP_Y = 20;
const PADDING = 24;
const BG_COLOR = { r: 255, g: 255, b: 255, alpha: 1 };

const LAYOUTS = {
  1: [[1]],
  2: [[2]],
  3: [[3]],
  5: [[3], [2]],
  7: [[4], [3]],
};

function getLayout(n) {
  if (LAYOUTS[n]) return LAYOUTS[n];
  const rows = Math.floor(n / 4);
  const rem = n % 4;
  const layout = Array(rows).fill([4]);
  if (rem) layout.push([rem]);
  return layout;
}

export default class ImageStitcher {
  /**
   * Stitches multiple images into a grid and returns a Buffer
   * @param {string[]} imagePaths
   * @returns {Promise<Buffer>}
   */
  static async stitch(imagePaths) {
    const layout = getLayout(imagePaths.length);
    const imagesData = await Promise.all(
      imagePaths.map(async (img) => {
        const buffer = await fs.readFile(img);
        // Resize to standard height and get metadata
        const resized = await sharp(buffer)
          .resize({ height: CARD_H })
          .flatten({ background: BG_COLOR })
          .toBuffer({ resolveWithObject: true });
        return resized;
      })
    );

    const cardWidths = imagesData.map((img) => img.info.width);
    const maxCardW = Math.max(...cardWidths);
    const maxCols = Math.max(...layout.map((row) => row[0]));
    const nRows = layout.length;

    const totalW = maxCols * maxCardW + (maxCols - 1) * GAP_X + PADDING * 2;
    const totalH = nRows * CARD_H + (nRows - 1) * GAP_Y + PADDING * 2;

    const composites = [];
    let cardIdx = 0;
    let y = PADDING;

    for (const rowSpec of layout) {
      const cols = rowSpec[0];
      const rowImages = imagesData.slice(cardIdx, cardIdx + cols);
      cardIdx += cols;

      const rowTotalW =
        rowImages.reduce((sum, img) => sum + img.info.width, 0) +
        GAP_X * (cols - 1);
      const xStart = Math.floor((totalW - rowTotalW) / 2);

      let x = xStart;
      for (const img of rowImages) {
        composites.push({
          input: img.data,
          top: y,
          left: x,
        });
        x += img.info.width + GAP_X;
      }

      y += CARD_H + GAP_Y;
    }

    return sharp({
      create: {
        width: totalW,
        height: totalH,
        channels: 4,
        background: BG_COLOR,
      },
    })
      .composite(composites)
      .png()
      .toBuffer();
  }
}
