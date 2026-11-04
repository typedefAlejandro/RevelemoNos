/**
 * Reduz uma imagem no navegador até caber no limite do Storage (2 MB).
 * Imagens que já cabem e têm tamanho razoável sobem como estão.
 */
export const LIMITE_CAPA = 2 * 1024 * 1024;
export const LIMITE_ORIGINAL = 25 * 1024 * 1024;
const LADO_MAXIMO = 1920;
const ACEITOS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export type ImagemPronta = { blob: Blob; tipo: string; ext: string; reduzida: boolean; tamanhoOriginal: number };

export function formatarMB(bytes: number) {
  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

function paraBlob(canvas: HTMLCanvasElement, tipo: string, qualidade: number) {
  return new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, qualidade));
}

export async function prepararImagem(arquivo: File): Promise<ImagemPronta> {
  if (arquivo.size > LIMITE_ORIGINAL) {
    throw new Error(`A imagem tem ${formatarMB(arquivo.size)}. Envie uma de até ${formatarMB(LIMITE_ORIGINAL)}.`);
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(arquivo);
  } catch {
    throw new Error("Não consegui abrir essa imagem. Use PNG, JPG ou WEBP (fotos HEIC do iPhone: exporte como JPG).");
  }

  const cabe = arquivo.size <= LIMITE_CAPA && ACEITOS[arquivo.type] && Math.max(bitmap.width, bitmap.height) <= 2560;
  if (cabe) {
    bitmap.close();
    return { blob: arquivo, tipo: arquivo.type, ext: ACEITOS[arquivo.type], reduzida: false, tamanhoOriginal: arquivo.size };
  }

  let escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  try {
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * escala);
      canvas.height = Math.round(bitmap.height * escala);
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const q of [0.9, 0.82, 0.74, 0.66, 0.58]) {
        let blob = await paraBlob(canvas, "image/webp", q);
        // Navegadores sem WebP devolvem PNG: cai para JPEG.
        if (!blob || blob.type !== "image/webp") blob = await paraBlob(canvas, "image/jpeg", q);
        if (blob && blob.size <= LIMITE_CAPA) {
          return { blob, tipo: blob.type, ext: ACEITOS[blob.type] ?? "jpg", reduzida: true, tamanhoOriginal: arquivo.size };
        }
      }
      escala *= 0.75;
    }
  } finally {
    bitmap.close();
  }
  throw new Error("Não consegui reduzir essa imagem para 2 MB. Tente outra.");
}
