'use strict';

import { DataTypes } from 'sequelize';
import { sequelize } from '../../configs/db-postgres.js';
import { User } from '../user/user.model.js';

export const RoleUpgradeRequest = sequelize.define('RoleUpgradeRequest', {
    Id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    UserId: {
        type: DataTypes.STRING(16),
        allowNull: false
    },
    RequestedRole: {
        type: DataTypes.STRING,
        allowNull: false
    },
    Status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
        defaultValue: 'PENDING'
    },
    ReviewedBy: {
        type: DataTypes.STRING(16),
        allowNull: true
    }
}, {
    timestamps: true
});

// Relaciones
RoleUpgradeRequest.belongsTo(User, { foreignKey: 'UserId' });
User.hasMany(RoleUpgradeRequest, { foreignKey: 'UserId' });