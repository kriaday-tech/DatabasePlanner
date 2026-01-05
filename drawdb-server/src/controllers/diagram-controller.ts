import { Response } from 'express';
import { Op } from 'sequelize';
import { Diagram, DiagramShare, User } from '../models';
import { AuthRequest } from '../middleware/auth';
import { PermissionLevel } from '../models/DiagramShare';
import { sequelize } from '../config/database';

export class DiagramController {
  // Get all diagrams (owned + shared with user)
  static async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Get user's own diagrams
      const ownDiagrams = await Diagram.findAll({
        where: { userId: req.userId },
        order: [['lastModified', 'DESC']],
      });

      // Get diagrams shared with user
      const sharedDiagramIds = await DiagramShare.findAll({
        where: { sharedWithUserId: req.userId },
        attributes: ['diagramId', 'permissionLevel'],
      });

      const sharedDiagrams = await Diagram.findAll({
        where: {
          id: {
            [Op.in]: sharedDiagramIds.map((s) => s.diagramId),
          },
        },
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'username', 'email'],
          },
        ],
      });

      // Add permission level to shared diagrams
      const sharedDiagramsWithPermissions = sharedDiagrams.map((diagram) => {
        const share = sharedDiagramIds.find((s) => s.diagramId === diagram.id);
        return {
          ...diagram.toJSON(),
          permissionLevel: share?.permissionLevel,
          isSharedWithMe: true,
        };
      });

      res.json({
        ownDiagrams,
        sharedDiagrams: sharedDiagramsWithPermissions,
      });
    } catch (error) {
      console.error('Get diagrams error:', error);
      res.status(500).json({
        error: 'Failed to get diagrams',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  // Get specific diagram
  static async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!req.userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const diagram = await Diagram.findByPk(id, {
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'username', 'email'],
          },
          {
            model: DiagramShare,
            as: 'shares',
            where: { sharedWithUserId: req.userId },
            required: false,
          },
        ],
      });

      if (!diagram) {
        res.status(404).json({ error: 'Diagram not found' });
        return;
      }

      // Check access rights
      const isOwner = diagram.userId === req.userId;
      const hasSharedAccess = diagram.shares && diagram.shares.length > 0;

      if (!isOwner && !hasSharedAccess) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.json(diagram);
    } catch (error) {
      console.error('Get diagram error:', error);
      res.status(500).json({
        error: 'Failed to get diagram',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  // Create new diagram
  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const diagramData = {
        ...req.body,
        userId: req.userId,
        lastModifiedBy: req.userId,
        version: 1,
      };

      const diagram = await Diagram.create(diagramData);

      res.status(201).json(diagram);
    } catch (error) {
      console.error('Create diagram error:', error);
      res.status(500).json({
        error: 'Failed to create diagram',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  // Update diagram with conflict detection
  static async update(req: AuthRequest, res: Response): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { expectedVersion, ...diagramData } = req.body;

      if (!req.userId) {
        await transaction.rollback();
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Find and lock diagram (without join to avoid FOR UPDATE with LEFT OUTER JOIN issue)
      const diagram = await Diagram.findOne({
        where: { id },
        lock: true,
        transaction,
      });

      if (!diagram) {
        await transaction.rollback();
        res.status(404).json({ error: 'Diagram not found' });
        return;
      }

      // Check edit permission - owner or has editor/owner share
      const isOwner = diagram.userId === req.userId;
      let hasEditAccess = false;

      if (!isOwner) {
        // Check if user has edit access via share
        const share = await DiagramShare.findOne({
          where: {
            diagramId: id,
            sharedWithUserId: req.userId,
            permissionLevel: {
              [Op.in]: [PermissionLevel.EDITOR, PermissionLevel.OWNER],
            },
          },
          transaction,
        });
        hasEditAccess = !!share;
      }

      if (!isOwner && !hasEditAccess) {
        await transaction.rollback();
        res.status(403).json({ error: 'No edit permission' });
        return;
      }

      // Conflict detection
      if (expectedVersion && diagram.version !== expectedVersion) {
        await transaction.rollback();
        res.status(409).json({
          error: 'Conflict detected',
          message: 'Diagram was modified by another user',
          currentVersion: {
            version: diagram.version,
            lastModified: diagram.lastModified,
            lastModifiedBy: diagram.lastModifiedBy,
            data: diagram.toJSON(),
          },
        });
        return;
      }

      // Update diagram
      await diagram.update(
        {
          ...diagramData,
          version: diagram.version + 1,
          lastModifiedBy: req.userId,
          lastModified: new Date(),
        },
        { transaction },
      );

      await transaction.commit();

      res.json(diagram);
    } catch (error) {
      await transaction.rollback();
      console.error('Update diagram error:', error);
      res.status(500).json({
        error: 'Failed to update diagram',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  // Delete diagram
  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!req.userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const diagram = await Diagram.findOne({
        where: { id, userId: req.userId },
      });

      if (!diagram) {
        res.status(404).json({ error: 'Diagram not found or access denied' });
        return;
      }

      await diagram.destroy();

      res.json({ message: 'Diagram deleted successfully' });
    } catch (error) {
      console.error('Delete diagram error:', error);
      res.status(500).json({
        error: 'Failed to delete diagram',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  // Get diagram version info
  static async getVersion(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!req.userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const diagram = await Diagram.findByPk(id, {
        attributes: ['id', 'version', 'lastModified', 'lastModifiedBy'],
        include: [
          {
            model: User,
            as: 'lastModifier',
            attributes: ['username'],
          },
        ],
      });

      if (!diagram) {
        res.status(404).json({ error: 'Diagram not found' });
        return;
      }

      res.json(diagram);
    } catch (error) {
      console.error('Get version error:', error);
      res.status(500).json({
        error: 'Failed to get version',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  // Duplicate diagram
  static async duplicate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!req.userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const originalDiagram = await Diagram.findByPk(id);

      if (!originalDiagram) {
        res.status(404).json({ error: 'Diagram not found' });
        return;
      }

      // Create duplicate
      const duplicateData = originalDiagram.toJSON();
      delete (duplicateData as { id?: string }).id;
      delete (duplicateData as { createdAt?: Date }).createdAt;
      delete (duplicateData as { updatedAt?: Date }).updatedAt;

      const newDiagram = await Diagram.create({
        ...duplicateData,
        name: `${originalDiagram.name} (Copy)`,
        userId: req.userId,
        lastModifiedBy: req.userId,
        version: 1,
        gistId: null,
        loadedFromGistId: originalDiagram.gistId,
      });

      res.status(201).json(newDiagram);
    } catch (error) {
      console.error('Duplicate diagram error:', error);
      res.status(500).json({
        error: 'Failed to duplicate diagram',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  // Sync diagram with conflict detection
  static async sync(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { expectedVersion } = req.body;

      if (!req.userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const diagram = await Diagram.findByPk(id);

      if (!diagram) {
        res.status(404).json({ error: 'Diagram not found' });
        return;
      }

      if (diagram.version !== expectedVersion) {
        res.status(409).json({
          error: 'Conflict detected',
          message: 'Diagram has been updated',
          currentVersion: diagram.toJSON(),
        });
        return;
      }

      res.json({
        message: 'In sync',
        version: diagram.version,
      });
    } catch (error) {
      console.error('Sync error:', error);
      res.status(500).json({
        error: 'Failed to sync',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  // Share diagram with user
  static async shareDiagram(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { userId: sharedWithUserId, permissionLevel } = req.body;

      if (!req.userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Verify diagram ownership
      const diagram = await Diagram.findOne({
        where: { id, userId: req.userId },
      });

      if (!diagram) {
        res.status(404).json({ error: 'Diagram not found or access denied' });
        return;
      }

      // Check if user exists
      const userToShareWith = await User.findByPk(sharedWithUserId);
      if (!userToShareWith) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Check if already shared
      const existingShare = await DiagramShare.findOne({
        where: {
          diagramId: id,
          sharedWithUserId,
        },
      });

      if (existingShare) {
        res.status(409).json({ error: 'Diagram already shared with this user' });
        return;
      }

      // Create share
      const share = await DiagramShare.create({
        diagramId: id,
        sharedWithUserId,
        sharedByUserId: req.userId,
        permissionLevel: permissionLevel as PermissionLevel,
      });

      // Update diagram isShared flag
      await diagram.update({ isShared: true });

      res.status(201).json({
        message: 'Diagram shared successfully',
        share,
      });
    } catch (error) {
      console.error('Share diagram error:', error);
      res.status(500).json({
        error: 'Failed to share diagram',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  // Get all shares for a diagram
  static async getShares(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!req.userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Verify ownership
      const diagram = await Diagram.findOne({
        where: { id, userId: req.userId },
      });

      if (!diagram) {
        res.status(404).json({ error: 'Diagram not found or access denied' });
        return;
      }

      const shares = await DiagramShare.findAll({
        where: { diagramId: id },
        include: [
          {
            model: User,
            as: 'sharedWith',
            attributes: ['id', 'username', 'email'],
          },
        ],
      });

      res.json(shares);
    } catch (error) {
      console.error('Get shares error:', error);
      res.status(500).json({
        error: 'Failed to get shares',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  // Update share permission
  static async updateShare(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, userId: sharedWithUserId } = req.params;
      const { permissionLevel } = req.body;

      if (!req.userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Verify ownership
      const diagram = await Diagram.findOne({
        where: { id, userId: req.userId },
      });

      if (!diagram) {
        res.status(404).json({ error: 'Diagram not found or access denied' });
        return;
      }

      // Find and update share
      const share = await DiagramShare.findOne({
        where: {
          diagramId: id,
          sharedWithUserId,
        },
      });

      if (!share) {
        res.status(404).json({ error: 'Share not found' });
        return;
      }

      await share.update({ permissionLevel: permissionLevel as PermissionLevel });

      res.json({
        message: 'Permission updated successfully',
        share,
      });
    } catch (error) {
      console.error('Update share error:', error);
      res.status(500).json({
        error: 'Failed to update share',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  // Revoke share
  static async revokeShare(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, userId: sharedWithUserId } = req.params;

      if (!req.userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Verify ownership
      const diagram = await Diagram.findOne({
        where: { id, userId: req.userId },
      });

      if (!diagram) {
        res.status(404).json({ error: 'Diagram not found or access denied' });
        return;
      }

      // Delete share
      const deleted = await DiagramShare.destroy({
        where: {
          diagramId: id,
          sharedWithUserId,
        },
      });

      if (!deleted) {
        res.status(404).json({ error: 'Share not found' });
        return;
      }

      // Check if any shares remain
      const remainingShares = await DiagramShare.count({
        where: { diagramId: id },
      });

      if (remainingShares === 0) {
        await diagram.update({ isShared: false });
      }

      res.json({ message: 'Share revoked successfully' });
    } catch (error) {
      console.error('Revoke share error:', error);
      res.status(500).json({
        error: 'Failed to revoke share',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  // Get diagrams shared with me
  static async getSharedWithMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const shares = await DiagramShare.findAll({
        where: { sharedWithUserId: req.userId },
        include: [
          {
            model: Diagram,
            as: 'diagram',
            include: [
              {
                model: User,
                as: 'owner',
                attributes: ['id', 'username', 'email'],
              },
            ],
          },
        ],
      });

      const sharedDiagrams = shares.map((share) => ({
        ...share.diagram?.toJSON(),
        permissionLevel: share.permissionLevel,
        sharedBy: share.sharedByUserId,
      }));

      res.json(sharedDiagrams);
    } catch (error) {
      console.error('Get shared diagrams error:', error);
      res.status(500).json({
        error: 'Failed to get shared diagrams',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }
}

export default DiagramController;

