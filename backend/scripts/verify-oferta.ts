import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import prisma from '../src/config/database';
import { buildOfertaHtmlDocument, buildOfertaPayload } from '../src/services/ofertaDocument.service';
import { resolvePresupuestoModules } from '../src/services/ofertaModules.service';
import { renderOfertaPdf } from '../src/services/pdfRenderer.service';

type CliArgs = {
  presupuestoId: number;
  templateCode?: string;
  outDir: string;
};

function parseArgs(argv: string[]): CliArgs {
  const parsed: Record<string, string> = {};

  for (const token of argv) {
    if (!token.startsWith('--')) continue;
    const [key, value] = token.slice(2).split('=');
    if (key && value) parsed[key] = value;
  }

  const presupuestoId = Number(parsed.presupuestoId || '0');
  if (!Number.isInteger(presupuestoId) || presupuestoId <= 0) {
    throw new Error('Uso: npm run verify:oferta -- --presupuestoId=123 [--template=OFERTA_EMT_360_V2] [--outDir=./tmp]');
  }

  return {
    presupuestoId,
    templateCode: parsed.template,
    outDir: parsed.outDir || './tmp',
  };
}

async function main() {
  const { presupuestoId, templateCode, outDir } = parseArgs(process.argv.slice(2));

  const presupuesto = await prisma.presupuesto.findUnique({
    where: { id: presupuestoId },
    include: {
      proyecto: { include: { cliente: true } },
      contexto: true,
      lineasMotor: { orderBy: { orden: 'asc' } },
      lineasTrabajo: { orderBy: { orden: 'asc' } },
      lineasMaterial: { orderBy: { orden: 'asc' } },
      lineasDesplazamiento: { orderBy: { orden: 'asc' } },
      textos: { orderBy: { orden: 'asc' } },
      snapshot: true,
    },
  });

  if (!presupuesto) {
    throw new Error(`Presupuesto ${presupuestoId} no encontrado`);
  }

  const anexosTecnicos = presupuesto.contexto?.solucionId
    ? await prisma.solucionAnexoTecnico.findMany({
        where: { solucionId: presupuesto.contexto.solucionId },
        select: { titulo: true, url: true, orden: true },
        orderBy: { orden: 'asc' },
      })
    : [];

  const versionOferta = presupuesto.snapshot
    ? presupuesto.snapshot.versionOferta + 1
    : (presupuesto.versionOferta || 1);
  const codigoOferta = presupuesto.codigoOferta || `OF-VERIFY-${new Date().getFullYear()}-${presupuesto.id}`;

  const payload = buildOfertaPayload({
    presupuesto,
    codigoOferta,
    versionOferta,
    fechaEmisionIso: new Date().toISOString(),
    templateCode,
    anexosTecnicos,
    modulosDocumento: await resolvePresupuestoModules(presupuesto, templateCode),
  });

  const hashContenido = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const html = buildOfertaHtmlDocument({
    presupuesto,
    templateCode,
    anexosTecnicos,
    modulosDocumento: await resolvePresupuestoModules(presupuesto, templateCode),
  });

  const fileBase = `${outDir.replace(/\/$/, '')}/oferta-${presupuesto.id}-${payload.template.codigo}`;
  await mkdir(outDir, { recursive: true });
  await writeFile(`${fileBase}.html`, html, 'utf-8');
  await writeFile(`${fileBase}.payload.json`, JSON.stringify(payload, null, 2), 'utf-8');
  await writeFile(`${fileBase}.sha256.txt`, `${hashContenido}\n`, 'utf-8');

  const provider = (process.env.OFERTA_PDF_PROVIDER || 'none').toLowerCase();
  if (provider !== 'none') {
    const pdf = await renderOfertaPdf({ html, fileNameBase: `oferta-${presupuesto.id}` });
    await writeFile(`${fileBase}.pdf`, pdf.content);
  }

  console.log(JSON.stringify({
    ok: true,
    presupuestoId: presupuesto.id,
    templateCode: payload.template.codigo,
    hashContenido,
    files: {
      html: `${fileBase}.html`,
      payload: `${fileBase}.payload.json`,
      hash: `${fileBase}.sha256.txt`,
      pdf: provider !== 'none' ? `${fileBase}.pdf` : null,
    },
    pdfProvider: provider,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
