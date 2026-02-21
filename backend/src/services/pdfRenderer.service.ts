type OfertaPdfRenderArgs = {
  html: string;
  fileNameBase: string;
};

type OfertaPdfRenderResult = {
  contentType: string;
  fileName: string;
  content: Buffer;
};

export async function renderOfertaPdf({ html, fileNameBase }: OfertaPdfRenderArgs): Promise<OfertaPdfRenderResult> {
  const provider = (process.env.OFERTA_PDF_PROVIDER || 'none').toLowerCase();

  if (provider === 'none') {
    throw new Error('OFERTA_PDF_PROVIDER no configurado. Usa /oferta-html para descarga HTML o configura proveedor PDF.');
  }

  if (provider === 'puppeteer') {
    let puppeteerLib: any;
    try {
      puppeteerLib = await import('puppeteer');
    } catch {
      throw new Error('Proveedor puppeteer no disponible. Instala dependencia `puppeteer` en backend.');
    }

    const launchOptions: Record<string, unknown> = {
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    const puppeteer = puppeteerLib.default || puppeteerLib;
    const browser = await puppeteer.launch(launchOptions);
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer: Buffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '16mm',
          right: '10mm',
          bottom: '16mm',
          left: '10mm',
        },
      });

      return {
        contentType: 'application/pdf',
        fileName: `${fileNameBase}.pdf`,
        content: pdfBuffer,
      };
    } finally {
      await browser.close();
    }
  }

  throw new Error(`Proveedor PDF no soportado: ${provider}`);
}
