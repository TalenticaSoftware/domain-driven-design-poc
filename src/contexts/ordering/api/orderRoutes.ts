import { Router, Request, Response } from 'express';
import { CreateOrderDto } from './dtos';
import { CreateOrderUseCase } from '../application/CreateOrderUseCase';
import { ConfirmOrderUseCase } from '../application/ConfirmOrderUseCase';
import { GetOrderUseCase } from '../application/GetOrderUseCase';
import { GetShipmentUseCase } from '../../shipping/application/GetShipmentUseCase';
import {
  asyncHandler,
  successResponse,
  validateBody,
} from '../../../shared/api/middleware';
import { CustomHttpException } from '../../../shared/errors/CustomHttpException';
import { validate as isValidUuid } from 'uuid';

interface OrderRouteDependencies {
  createOrderUseCase: CreateOrderUseCase;
  confirmOrderUseCase: ConfirmOrderUseCase;
  getOrderUseCase: GetOrderUseCase;
  getShipmentUseCase: GetShipmentUseCase;
}

const assertUuidParam = (value: string, paramName: string): void => {
  if (!isValidUuid(value)) {
    throw CustomHttpException.badRequest(
      `${paramName} must be a valid UUID`,
      'INVALID_PATH_PARAM',
    );
  }
};

export const buildOrderRoutes = (dependencies: OrderRouteDependencies): Router => {
  const router = Router();

  router.post(
    '/',
    validateBody(CreateOrderDto),
    asyncHandler(async (req: Request, res: Response) => {
      const body = req.body as CreateOrderDto;
      const result = await dependencies.createOrderUseCase.execute(body);
      res.status(201).json(successResponse(result));
    }),
  );

  router.post(
    '/:id/confirm',
    asyncHandler(async (req: Request, res: Response) => {
      assertUuidParam(req.params.id, 'id');
      const result = await dependencies.confirmOrderUseCase.execute(req.params.id);
      res.status(200).json(successResponse(result));
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      assertUuidParam(req.params.id, 'id');
      const order = await dependencies.getOrderUseCase.execute(req.params.id);
      const shipment = await dependencies.getShipmentUseCase.findByOrderId(req.params.id);
      res.status(200).json(successResponse({ ...order, shipment }));
    }),
  );

  return router;
};
