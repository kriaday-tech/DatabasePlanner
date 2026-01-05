import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface DiagramAttributes {
  id: string;
  userId: string;
  name: string;
  database: string;
  tables: Array<unknown>;
  references: Array<unknown>;
  notes: Array<unknown>;
  areas: Array<unknown>;
  todos: Array<unknown>;
  enums: Array<unknown> | null;
  types: Array<unknown> | null;
  pan: { x: number; y: number } | null;
  zoom: number | null;
  gistId: string | null;
  loadedFromGistId: string | null;
  lastModified: Date;
  lastModifiedBy: string | null;
  version: number;
  isShared: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DiagramCreationAttributes
  extends Optional<
    DiagramAttributes,
    | 'id'
    | 'tables'
    | 'references'
    | 'notes'
    | 'areas'
    | 'todos'
    | 'enums'
    | 'types'
    | 'pan'
    | 'zoom'
    | 'gistId'
    | 'loadedFromGistId'
    | 'lastModified'
    | 'lastModifiedBy'
    | 'version'
    | 'isShared'
  > {}

export class Diagram
  extends Model<DiagramAttributes, DiagramCreationAttributes>
  implements DiagramAttributes
{
  public id!: string;
  public userId!: string;
  public name!: string;
  public database!: string;
  public tables!: Array<unknown>;
  public references!: Array<unknown>;
  public notes!: Array<unknown>;
  public areas!: Array<unknown>;
  public todos!: Array<unknown>;
  public enums!: Array<unknown> | null;
  public types!: Array<unknown> | null;
  public pan!: { x: number; y: number } | null;
  public zoom!: number | null;
  public gistId!: string | null;
  public loadedFromGistId!: string | null;
  public lastModified!: Date;
  public lastModifiedBy!: string | null;
  public version!: number;
  public isShared!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public readonly shares?: Array<any>;
}

Diagram.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'Untitled Diagram',
    },
    database: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'generic',
    },
    tables: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    references: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    notes: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    areas: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    todos: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    enums: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    types: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    pan: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: { x: 0, y: 0 },
    },
    zoom: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 1.0,
    },
    gistId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    loadedFromGistId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    lastModified: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    lastModifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    isShared: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'diagrams',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id', 'last_modified'],
      },
      {
        fields: ['user_id', 'name'],
      },
      {
        fields: ['version'],
      },
    ],
  },
);

export default Diagram;

