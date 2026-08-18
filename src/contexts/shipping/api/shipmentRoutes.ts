import { Router, Request, Response } from 'express';
import { IsEnum } from 'class-validator';
import { UpdateDeliveryStatusUseCase } from '../application/UpdateDeliveryStatusUseCase';
import { GetShipmentUseCase } from '../application/GetShipmentUseCase';
import { ShipmentStatusValue } from '../domain/value-objects/ShipmentStatus';
import {
  asyncHandler,
  successResponse,
  validateBody,
} from '../../../shared/api/middleware';
import { CustomHttpException } from '../../../shared/errors/CustomHttpException';
import { validate as isValidUuid } from 'uuid';

export class UpdateShipmentStatusDto {
  @IsEnum(ShipmentStatusValue, {
    message: `status must be one of: ${Object.values(ShipmentStatusValue).join(', ')}`,
  })
  status!: ShipmentStatusValue;
}

interface ShipmentRouteDependencies {
  updateDeliveryStatusUseCase: UpdateDeliveryStatusUseCase;
  getShipmentUseCase: GetShipmentUseCase;
}

const assertUuidParam = (value: string): void => {
  if (!isValidUuid(value)) {
    throw CustomHttpException.badRequest('id must be a valid UUID', 'INVALID_PATH_PARAM');
  }
};

export const buildShipmentRoutes = (dependencies: ShipmentRouteDependencies): Router => {
  const router = Router();

  router.patch(
    '/:id/status',
    validateBody(UpdateShipmentStatusDto),
    asyncHandler(async (req: Request, res: Response) => {
      assertUuidParam(req.params.id);
      const body = req.body as UpdateShipmentStatusDto;
      const result = await dependencies.updateDeliveryStatusUseCase.execute(
        req.params.id,
        body.status,
      );
      res.status(200).json(successResponse(result));
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      assertUuidParam(req.params.id);
      const result = await dependencies.getShipmentUseCase.execute(req.params.id);
      res.status(200).json(successResponse(result));
    }),
  );

  return router;
};
