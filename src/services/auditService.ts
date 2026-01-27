import { db } from '../database';
import { users } from '../database/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { pgTable, serial, integer, varchar, timestamp, boolean, text, jsonb } from 'drizzle-orm/pg-core';
import type { User } from '../database/schema';

export interface AuditLog {
  id?: number;
  userId: number;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export class AuditService {
  /**
   * Log a user action for audit purposes
   * @param userId User ID performing the action
   * @param action Action performed (e.g., 'create_shipment', 'search_shipment')
   * @param resourceType Type of resource accessed (e.g., 'shipment', 'user')
   * @param resourceId ID of the resource accessed (optional)
   * @param details Additional details about the action
   * @param success Whether the action was successful
   * @param errorMessage Error message if action failed
   */
  static async logUserAction(
    userId: number,
    action: string,
    resourceType: string,
    resourceId?: string | null,
    details?: any,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    try {
      const auditLog: Omit<AuditLog, 'id'> = {
        userId,
        action,
        resourceType,
        resourceId,
        details,
        timestamp: new Date(),
        success,
        errorMessage,
      };

      await db.insert(auditLogs).values(auditLog);
    } catch (error) {
      console.error('Failed to log audit action:', error);
      // Don't throw here as this shouldn't break the main application flow
    }
  }

  /**
   * Log data access attempts
   * @param userId User ID accessing data
   * @param dataType Type of data being accessed
   * @param recordId ID of the record being accessed
   * @param success Whether access was successful
   * @param errorMessage Error message if access failed
   */
  static async logDataAccess(
    userId: number,
    dataType: string,
    recordId: number | string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.logUserAction(
      userId,
      'data_access',
      dataType,
      recordId?.toString(),
      { dataType, recordId },
      success,
      errorMessage
    );
  }

  /**
   * Log authentication events
   * @param telegramId Telegram ID of the user
   * @param success Whether authentication was successful
   * @param errorMessage Error message if authentication failed
   */
  static async logAuthentication(
    telegramId: number,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    try {
      // Get user ID from Telegram ID
      const user = await db.select()
        .from(users)
        .where(eq(users.telegramId, telegramId))
        .limit(1);

      const userId = user.length > 0 ? user[0].id : telegramId;

      await this.logUserAction(
        userId,
        'authentication',
        'user',
        telegramId.toString(),
        { telegramId },
        success,
        errorMessage
      );
    } catch (error) {
      console.error('Failed to log authentication:', error);
    }
  }

  /**
   * Log shipment-related actions
   * @param userId User ID performing the action
   * @param action Action performed (create, update, delete, search)
   * @param shipmentId Shipment ID involved
   * @param details Additional shipment details
   * @param success Whether the action was successful
   * @param errorMessage Error message if action failed
   */
  static async logShipmentAction(
    userId: number,
    action: 'create' | 'update' | 'delete' | 'search',
    shipmentId: number | string,
    details?: any,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.logUserAction(
      userId,
      `shipment_${action}`,
      'shipment',
      shipmentId?.toString(),
      details,
      success,
      errorMessage
    );
  }

  /**
   * Log search attempts
   * @param userId User ID performing the search
   * @param searchTerm Search term used
   * @param success Whether search was successful
   * @param errorMessage Error message if search failed
   */
  static async logSearchAttempt(
    userId: number,
    searchTerm: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.logUserAction(
      userId,
      'search',
      'shipment',
      undefined,
      { searchTerm },
      success,
      errorMessage
    );
  }

  /**
   * Get audit logs for a specific user
   * @param userId User ID
   * @param limit Number of logs to return
   * @param offset Offset for pagination
   * @returns Array of audit logs
   */
  static async getUserAuditLogs(userId: number, limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      return await db.select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .orderBy(desc(auditLogs.timestamp))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error('Failed to get user audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit logs for a specific action
   * @param action Action to filter by
   * @param limit Number of logs to return
   * @param offset Offset for pagination
   * @returns Array of audit logs
   */
  static async getActionAuditLogs(action: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      return await db.select()
        .from(auditLogs)
        .where(eq(auditLogs.action, action))
        .orderBy(desc(auditLogs.timestamp))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error('Failed to get action audit logs:', error);
      return [];
    }
  }

  /**
   * Get failed actions for monitoring
   * @param limit Number of logs to return
   * @param hours Number of hours to look back
   * @returns Array of failed audit logs
   */
  static async getFailedActions(limit: number = 100, hours: number = 24): Promise<any[]> {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      return await db.select()
        .from(auditLogs)
        .where(and(
          eq(auditLogs.success, false),
          gte(auditLogs.timestamp, cutoffTime)
        ))
        .orderBy(desc(auditLogs.timestamp))
        .limit(limit);
    } catch (error) {
      console.error('Failed to get failed actions:', error);
      return [];
    }
  }
}

// Note: This would need to be added to the database schema
// For now, this is a placeholder for the audit logs table
const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }).notNull(),
  resourceId: varchar('resource_id', { length: 100 }),
  details: jsonb('details'), // PostgreSQL JSONB type
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  success: boolean('success').notNull(),
  errorMessage: text('error_message'),
});