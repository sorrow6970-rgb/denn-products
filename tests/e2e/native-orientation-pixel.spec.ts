import { expect, test } from "@playwright/test";

const mappings = [
  [0, 1, 2, 3],
  [1, 0, 3, 2],
  [2, 3, 0, 1],
  [3, 2, 1, 0],
  [0, 3, 2, 1],
  [3, 0, 1, 2],
  [2, 1, 0, 3],
  [1, 2, 3, 0],
];
const colors = [
  [240, 32, 32],
  [32, 224, 48],
  [32, 64, 224],
  [240, 208, 32],
];
for (const format of ["jpeg", "png"] as const) {
  for (const shape of ["rectangle", "square"] as const) {
    for (const orientation of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
      test(`spec111 ${format} ${shape} orientation=${orientation || "absent"}`, async ({
        page,
      }) => {
        const external: string[] = [],
          errors: string[] = [];
        await page.route("**/*", (r) => {
          external.push(r.request().url());
          return r.abort();
        });
        page.on("console", (m) => {
          if (["error", "warning"].includes(m.type())) errors.push(m.type());
        });
        page.on("pageerror", () => errors.push("pageerror"));
        const result = await page.evaluate(
          async ({ format, shape, orientation, colors }) => {
            const width = shape === "square" ? 40 : 48,
              height = shape === "square" ? 40 : 32;
            const source = document.createElement("canvas"),
              output = document.createElement("canvas");
            let bitmap: ImageBitmap | null = null;
            try {
              source.width = width;
              source.height = height;
              const ctx = source.getContext("2d");
              if (!ctx) throw new Error("no context");
              const points = [
                [0, 0],
                [width / 2, 0],
                [width / 2, height / 2],
                [0, height / 2],
              ];
              colors.forEach((rgb, i) => {
                ctx.fillStyle = `rgb(${rgb.join(",")})`;
                ctx.fillRect(points[i][0], points[i][1], width / 2, height / 2);
              });
              const blob = await new Promise<Blob>((resolve, reject) =>
                source.toBlob(
                  (b) => (b ? resolve(b) : reject(new Error("encode"))),
                  `image/${format}`,
                  1,
                ),
              );
              if (blob.type !== `image/${format}`) throw new Error("format fallback");
              let bytes = new Uint8Array(await blob.arrayBuffer());
              if (
                format === "jpeg"
                  ? bytes[0] !== 255 || bytes[1] !== 216
                  : bytes[0] !== 137 || bytes[1] !== 80
              )
                throw new Error("signature");
              if (orientation) {
                const profile = new Uint8Array(26),
                  v = new DataView(profile.buffer);
                profile.set([73, 73, 42, 0, 8, 0, 0, 0]);
                v.setUint16(8, 1, true);
                v.setUint16(10, 274, true);
                v.setUint16(12, 3, true);
                v.setUint32(14, 1, true);
                v.setUint16(18, orientation, true);
                if (format === "jpeg")
                  bytes = new Uint8Array([
                    255,
                    216,
                    255,
                    225,
                    0,
                    34,
                    69,
                    120,
                    105,
                    102,
                    0,
                    0,
                    ...profile,
                    ...bytes.subarray(2),
                  ]);
                else {
                  const body = new Uint8Array([101, 88, 73, 102, ...profile]);
                  let crc = 0xffffffff;
                  for (const b of body) {
                    crc ^= b;
                    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
                  }
                  crc = (crc ^ 0xffffffff) >>> 0;
                  bytes = new Uint8Array([
                    ...bytes.subarray(0, 33),
                    0,
                    0,
                    0,
                    26,
                    ...body,
                    crc >>> 24,
                    (crc >>> 16) & 255,
                    (crc >>> 8) & 255,
                    crc & 255,
                    ...bytes.subarray(33),
                  ]);
                }
              }
              bitmap = await createImageBitmap(new Blob([bytes], { type: `image/${format}` }), {
                imageOrientation: "from-image",
              });
              output.width = bitmap.width;
              output.height = bitmap.height;
              const out = output.getContext("2d", { willReadFrequently: true });
              if (!out) throw new Error("no output context");
              out.drawImage(bitmap, 0, 0);
              const locations = [
                [0.25, 0.25],
                [0.75, 0.25],
                [0.75, 0.75],
                [0.25, 0.75],
              ];
              const samples = locations.map(([x, y]) =>
                Array.from(
                  out.getImageData(
                    Math.floor(output.width * x),
                    Math.floor(output.height * y),
                    1,
                    1,
                  ).data,
                ),
              );
              return { width: bitmap.width, height: bitmap.height, samples };
            } finally {
              bitmap?.close();
              source.width = 0;
              source.height = 0;
              output.width = 0;
              output.height = 0;
            }
          },
          { format, shape, orientation, colors },
        );
        const w = shape === "square" ? 40 : 48,
          h = shape === "square" ? 40 : 32;
        expect([result.width, result.height]).toEqual(orientation >= 5 ? [h, w] : [w, h]);
        const expected = mappings[Math.max(1, orientation) - 1];
        for (let i = 0; i < 4; i++) {
          expect(result.samples[i][3]).toBe(255);
          for (let channel = 0; channel < 3; channel++)
            expect(
              Math.abs(result.samples[i][channel] - colors[expected[i]][channel]),
            ).toBeLessThanOrEqual(format === "jpeg" ? 16 : 0);
        }
        expect(external).toEqual([]);
        expect(errors).toEqual([]);
      });
    }
  }
}
