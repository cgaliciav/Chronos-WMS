import { Request, Response, NextFunction } from 'express';
import { getRepository } from 'typeorm';
import GrupoController from './Grupo.Controller';
import { Movimiento } from '../entity/Movimiento';
import { Grupo } from '../entity/Grupo';
import { InventarioActual } from '../entity/InventarioActual';
import { Sesion } from '../entity/Sesion';
import { AppError } from '../helpers/errorClases';
import InventarioActualController from './InventarioActual.Controller';
import MovimientoController from './Movimiento.Controller';

jest.mock('typeorm', () => ({
  getRepository: jest.fn(),
}));

jest.mock('./InventarioActual.Controller', () => ({
  obtenerInventarioActualDeCodigo: jest.fn(),
}));

jest.mock('./Movimiento.Controller', () => ({
  guardar: jest.fn(),
  guardarConOperacion: jest.fn(),
}));

describe('GrupoController', () => {
  describe('agregarMovimiento', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
      req = {
        body: {
          codigo: 'test-code',
          cantidad: 10,
          movimientoTipoId: 3,
          proyectoId: 1,
          usuariosIds: [1, 2],
          grupoId: 1,
        },
      };
      res = {
        locals: {
          jwtPayload: {
            si: 1,
          },
        },
      };
      next = jest.fn();
    });

    it('should add a movement to a group', async () => {
      const mockInventarioActual = new InventarioActual();
      const mockMovimiento = new Movimiento();
      const mockGrupo = new Grupo();
      mockGrupo.movimientos = [];

      (InventarioActualController.obtenerInventarioActualDeCodigo as jest.Mock).mockResolvedValue(mockInventarioActual);
      (MovimientoController.guardarConOperacion as jest.Mock).mockResolvedValue(mockMovimiento);
      (getRepository as jest.Mock).mockReturnValue({
        findOneOrFail: jest.fn().mockResolvedValue(mockGrupo),
        save: jest.fn().mockResolvedValue(mockGrupo),
      });

      await GrupoController.agregarMovimiento(req as Request, res as Response, next);

      expect(InventarioActualController.obtenerInventarioActualDeCodigo).toHaveBeenCalledWith('test-code');
      expect(MovimientoController.guardarConOperacion).toHaveBeenCalledWith(
        10,
        mockInventarioActual,
        3,
        1,
        [1, 2],
        1
      );
      expect(mockGrupo.movimientos).toContain(mockMovimiento);
      expect(getRepository(Grupo).save).toHaveBeenCalledWith(mockGrupo);
      expect(res.json).toHaveBeenCalledWith(mockMovimiento);
    });

    it('should handle errors', async () => {
      const error = new AppError('Test error');
      (InventarioActualController.obtenerInventarioActualDeCodigo as jest.Mock).mockRejectedValue(error);

      await GrupoController.agregarMovimiento(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});