import { Router } from 'express';
import { DiagramController } from '../controllers/diagram-controller';
import { authenticate } from '../middleware/auth';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Diagram CRUD endpoints
router.get('/', DiagramController.getAll);

router.get(
  '/:id',
  param('id').isUUID().withMessage('Invalid diagram ID'),
  validate,
  DiagramController.getById,
);

router.post(
  '/',
  body('name').optional().isString().trim().isLength({ min: 1, max: 255 }),
  body('database').optional().isString().trim(),
  body('tables').optional().isArray(),
  body('references').optional().isArray(),
  body('notes').optional().isArray(),
  body('areas').optional().isArray(),
  body('todos').optional().isArray(),
  validate,
  DiagramController.create,
);

router.put(
  '/:id',
  param('id').isUUID().withMessage('Invalid diagram ID'),
  body('name').optional().isString().trim().isLength({ min: 1, max: 255 }),
  body('expectedVersion').optional().isInt(),
  validate,
  DiagramController.update,
);

router.delete(
  '/:id',
  param('id').isUUID().withMessage('Invalid diagram ID'),
  validate,
  DiagramController.delete,
);

router.post(
  '/:id/duplicate',
  param('id').isUUID().withMessage('Invalid diagram ID'),
  validate,
  DiagramController.duplicate,
);

// Version control endpoints
router.get(
  '/:id/version',
  param('id').isUUID().withMessage('Invalid diagram ID'),
  validate,
  DiagramController.getVersion,
);

router.post(
  '/:id/sync',
  param('id').isUUID().withMessage('Invalid diagram ID'),
  body('expectedVersion').isInt(),
  validate,
  DiagramController.sync,
);

// Collaboration endpoints
router.post(
  '/:id/share',
  param('id').isUUID().withMessage('Invalid diagram ID'),
  body('userId').isUUID().withMessage('Invalid user ID'),
  body('permissionLevel')
    .isIn(['viewer', 'editor', 'owner'])
    .withMessage('Invalid permission level'),
  validate,
  DiagramController.shareDiagram,
);

router.get(
  '/:id/shares',
  param('id').isUUID().withMessage('Invalid diagram ID'),
  validate,
  DiagramController.getShares,
);

router.put(
  '/:id/shares/:userId',
  param('id').isUUID().withMessage('Invalid diagram ID'),
  param('userId').isUUID().withMessage('Invalid user ID'),
  body('permissionLevel')
    .isIn(['viewer', 'editor', 'owner'])
    .withMessage('Invalid permission level'),
  validate,
  DiagramController.updateShare,
);

router.delete(
  '/:id/shares/:userId',
  param('id').isUUID().withMessage('Invalid diagram ID'),
  param('userId').isUUID().withMessage('Invalid user ID'),
  validate,
  DiagramController.revokeShare,
);

router.get('/shared-with-me', DiagramController.getSharedWithMe);

export const diagramRouter = router;
export default diagramRouter;

