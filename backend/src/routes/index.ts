import { Router } from 'express';
import authRoutes from './auth.routes';
import empresasRoutes from './empresas.routes';
import cocherasRoutes from './cocheras.routes';
import autobusesRoutes from './autobuses.routes';
import trabajosRoutes from './trabajos.routes';
import materialesRoutes from './materiales.routes';
import proyectosRoutes from './proyectos.routes';
import replanteosRoutes from './replanteos.routes';
import presupuestosRoutes from './presupuestos.routes';
import comprasRoutes from './compras.routes';
import ordenesRoutes from './ordenes.routes';
import controlRoutes from './control.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/empresas', empresasRoutes);
router.use('/cocheras', cocherasRoutes);
router.use('/autobuses', autobusesRoutes);
router.use('/trabajos', trabajosRoutes);
router.use('/materiales', materialesRoutes);
router.use('/proyectos', proyectosRoutes);
router.use('/replanteos', replanteosRoutes);
router.use('/presupuestos', presupuestosRoutes);
router.use('/compras', comprasRoutes);
router.use('/ordenes-trabajo', ordenesRoutes);
router.use('/control', controlRoutes);

export default router;
