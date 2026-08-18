import { Router, Request, Response } from 'express';
import { IsInt, IsPositive, IsUUID } from 'class-validator';
import { ManageStockUseCase } from '../application/ManageStockUseCase';
import {
  asyncHandler,
  successResponse,
  validateBody,
} from '../../../shared/api/middleware';
import { CustomHttpException } from '../../../shared/errors/CustomHttpException';
import { validate as isValidUuid } from 'uuid';

export class UpsertStockDto {
  @IsUUID('4', { message: 'productId must be a valid UUID' })
  productId!: string;

  @IsInt()
  @IsPositive({ message: 'quantity must be a positive integer' })
  quantity!: number;
}

export const buildInventoryRoutes = (manageStockUseCase: ManageStockUseCase): Router => {
  const router = Router();

  router.post(
    '/',
    validateBody(UpsertStockDto),
    asyncHandler(async (req: Request, res: Response) => {
      const body = req.body as UpsertStockDto;
      const result = await manageStockUseCase.upsertStock(body);
      res.status(201).json(successResponse(result));
    }),
  );

  router.get(
    '/:productId',
    asyncHandler(async (req: Request, res: Response) => {
      if (!isValidUuid(req.params.productId)) {
        throw CustomHttpException.badRequest(
          'productId must be a valid UUID',
          'INVALID_PATH_PARAM',
        );
      }
      const result = await manageStockUseCase.getStock(req.params.productId);
      res.status(200).json(successResponse(result));
    }),
  );

  return router;
};
