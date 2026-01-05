import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum PermissionLevel {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  OWNER = 'owner',
}

interface DiagramShareAttributes {
  id: string;
  diagramId: string;
  sharedWithUserId: string;
  sharedByUserId: string;
  permissionLevel: PermissionLevel;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DiagramShareCreationAttributes
  extends Optional<DiagramShareAttributes, 'id' | 'permissionLevel'> {}

export class DiagramShare
  extends Model<DiagramShareAttributes, DiagramShareCreationAttributes>
  implements DiagramShareAttributes
{
  public id!: string;
  public diagramId!: string;
  public sharedWithUserId!: string;
  public sharedByUserId!: string;
  public permissionLevel!: PermissionLevel;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public readonly diagram?: any;
}

DiagramShare.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    diagramId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'diagrams',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    sharedWithUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    sharedByUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    permissionLevel: {
      type: DataTypes.ENUM(...Object.values(PermissionLevel)),
      allowNull: false,
      defaultValue: PermissionLevel.VIEWER,
    },
  },
  {
    sequelize,
    tableName: 'diagram_shares',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['diagram_id', 'shared_with_user_id'],
        name: 'unique_diagram_user',
      },
      {
        fields: ['shared_with_user_id'],
      },
      {
        fields: ['diagram_id'],
      },
      {
        fields: ['shared_by_user_id'],
      },
    ],
  },
);

export default DiagramShare;

