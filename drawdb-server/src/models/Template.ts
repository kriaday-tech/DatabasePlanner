import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface TemplateAttributes {
  id: string;
  userId: string | null;
  title: string;
  custom: boolean;
  data: Record<string, unknown>;
  isPublic: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TemplateCreationAttributes
  extends Optional<TemplateAttributes, 'id' | 'userId' | 'custom' | 'isPublic'> {}

export class Template
  extends Model<TemplateAttributes, TemplateCreationAttributes>
  implements TemplateAttributes
{
  public id!: string;
  public userId!: string | null;
  public title!: string;
  public custom!: boolean;
  public data!: Record<string, unknown>;
  public isPublic!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Template.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // null for system templates
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    custom: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'templates',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['custom', 'is_public'],
      },
    ],
  },
);

export default Template;

