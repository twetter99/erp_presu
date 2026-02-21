import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import {
  OfertaTemplateModule,
  OfertaTemplateModuleKey,
  resolveOfertaTemplateModules,
  resolveOfertaTemplateSpec,
} from '../config/ofertaTemplate.spec';

type OfertaTemplateModuleOverride = {
  key: OfertaTemplateModuleKey;
  title?: string;
  content?: string;
  enabled?: boolean;
  order?: number;
};

const CONFIG_KEY_PREFIX = 'oferta_template_modules:';

function parseGlobalModulesConfig(value?: string | null): OfertaTemplateModuleOverride[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === 'object' && typeof item.key === 'string')
      .map((item) => ({
        key: item.key,
        title: typeof item.title === 'string' ? item.title : undefined,
        content: typeof item.content === 'string' ? item.content : undefined,
        enabled: typeof item.enabled === 'boolean' ? item.enabled : undefined,
        order: typeof item.order === 'number' ? item.order : undefined,
      })) as OfertaTemplateModuleOverride[];
  } catch {
    return [];
  }
}

function mergeModules(defaultModules: OfertaTemplateModule[], overrides: OfertaTemplateModuleOverride[]): OfertaTemplateModule[] {
  const overrideByKey = new Map(overrides.map((item) => [item.key, item]));

  return defaultModules
    .map((module) => {
      const override = overrideByKey.get(module.key);
      if (!override) return { ...module };

      return {
        ...module,
        title: override.title ?? module.title,
        content: override.content ?? module.content,
        enabled: override.enabled ?? module.enabled,
        order: override.order ?? module.order,
      };
    })
    .sort((left, right) => left.order - right.order);
}

export async function getGlobalTemplateModuleOverrides(templateCode?: string | null): Promise<OfertaTemplateModuleOverride[]> {
  const resolvedCode = resolveOfertaTemplateSpec(templateCode).codigo;
  const key = `${CONFIG_KEY_PREFIX}${resolvedCode}`;

  const config = await prisma.configuracion.findUnique({
    where: { clave: key },
    select: { valor: true },
  });

  return parseGlobalModulesConfig(config?.valor);
}

export async function saveGlobalTemplateModuleOverrides(templateCode: string, overrides: OfertaTemplateModuleOverride[]) {
  const resolvedCode = resolveOfertaTemplateSpec(templateCode).codigo;
  const key = `${CONFIG_KEY_PREFIX}${resolvedCode}`;

  await prisma.configuracion.upsert({
    where: { clave: key },
    update: {
      valor: JSON.stringify(overrides),
      descripcion: `Overrides de módulos documentales para plantilla ${resolvedCode}`,
    },
    create: {
      clave: key,
      valor: JSON.stringify(overrides),
      descripcion: `Overrides de módulos documentales para plantilla ${resolvedCode}`,
    },
  });
}

export async function resolveTemplateModules(templateCode?: string | null): Promise<OfertaTemplateModule[]> {
  const defaults = resolveOfertaTemplateModules(templateCode);
  const globalOverrides = await getGlobalTemplateModuleOverrides(templateCode);
  return mergeModules(defaults, globalOverrides);
}

export function getPresupuestoModuleOverridesFromContext(contexto: any): OfertaTemplateModuleOverride[] {
  const maybeExtras = contexto?.extrasJson;
  if (!maybeExtras || typeof maybeExtras !== 'object') return [];

  const overrides = (maybeExtras as Record<string, unknown>).ofertaModulos;
  if (!Array.isArray(overrides)) return [];

  return overrides
    .filter((item) => item && typeof item === 'object' && typeof (item as any).key === 'string')
    .map((item: any) => ({
      key: item.key,
      title: typeof item.title === 'string' ? item.title : undefined,
      content: typeof item.content === 'string' ? item.content : undefined,
      enabled: typeof item.enabled === 'boolean' ? item.enabled : undefined,
      order: typeof item.order === 'number' ? item.order : undefined,
    })) as OfertaTemplateModuleOverride[];
}

export async function resolvePresupuestoModules(presupuesto: any, templateCode?: string | null): Promise<OfertaTemplateModule[]> {
  const baseModules = await resolveTemplateModules(templateCode);
  const presupuestoOverrides = getPresupuestoModuleOverridesFromContext(presupuesto.contexto);
  return mergeModules(baseModules, presupuestoOverrides);
}

export async function savePresupuestoModuleOverrides(presupuestoId: number, overrides: OfertaTemplateModuleOverride[]) {
  const contexto = await prisma.presupuestoContexto.findUnique({
    where: { presupuestoId },
    select: { id: true, extrasJson: true, numVehiculos: true },
  });

  const extrasBase: Prisma.JsonObject = (contexto?.extrasJson && typeof contexto.extrasJson === 'object')
    ? { ...(contexto.extrasJson as Prisma.JsonObject) }
    : {};

  extrasBase.ofertaModulos = overrides;

  await prisma.presupuestoContexto.upsert({
    where: { presupuestoId },
    update: {
      extrasJson: extrasBase as Prisma.InputJsonValue,
    },
    create: {
      presupuestoId,
      numVehiculos: 1,
      extrasJson: extrasBase as Prisma.InputJsonValue,
    },
  });
}

export type { OfertaTemplateModuleOverride };
