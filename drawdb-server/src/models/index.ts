import User from './User';
import Diagram from './Diagram';
import DiagramShare from './DiagramShare';
import Template from './Template';

// Define associations
User.hasMany(Diagram, {
  foreignKey: 'userId',
  as: 'diagrams',
});

Diagram.belongsTo(User, {
  foreignKey: 'userId',
  as: 'owner',
});

Diagram.belongsTo(User, {
  foreignKey: 'lastModifiedBy',
  as: 'lastModifier',
});

User.hasMany(Template, {
  foreignKey: 'userId',
  as: 'templates',
});

Template.belongsTo(User, {
  foreignKey: 'userId',
  as: 'owner',
});

// DiagramShare associations
Diagram.hasMany(DiagramShare, {
  foreignKey: 'diagramId',
  as: 'shares',
});

DiagramShare.belongsTo(Diagram, {
  foreignKey: 'diagramId',
  as: 'diagram',
});

User.hasMany(DiagramShare, {
  foreignKey: 'sharedWithUserId',
  as: 'sharedDiagrams',
});

DiagramShare.belongsTo(User, {
  foreignKey: 'sharedWithUserId',
  as: 'sharedWith',
});

User.hasMany(DiagramShare, {
  foreignKey: 'sharedByUserId',
  as: 'diagramsSharedByMe',
});

DiagramShare.belongsTo(User, {
  foreignKey: 'sharedByUserId',
  as: 'sharedBy',
});

export { User, Diagram, DiagramShare, Template };

