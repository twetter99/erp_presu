import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: error.errors.map((e) => ({
            campo: e.path.join('.'),
            mensaje: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Parámetros de consulta inválidos',
          details: error.errors.map((e) => ({
            campo: e.path.join('.'),
            mensaje: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}
