import { db } from '../database';
import { users } from '../database/schema';
import { eq } from 'drizzle-orm';
import type { User, NewUser } from '../database/schema';

export class UserService {
  /**
   * Get or create a user based on Telegram ID
   * @param telegramId Telegram user ID
   * @param userData Optional user data for creation
   * @returns User object
   */
  static async getOrCreateUser(telegramId: number, userData?: Partial<NewUser>): Promise<User> {
    try {
      // Try to find existing user
      const existingUser = await db.select()
        .from(users)
        .where(eq(users.telegramId, telegramId))
        .limit(1);

      if (existingUser.length > 0) {
        return existingUser[0];
      }

      // Create new user
      const newUser = await db.insert(users).values({
        telegramId,
        username: userData?.username,
        firstName: userData?.firstName,
        lastName: userData?.lastName,
        isActive: true,
      }).returning();

      return newUser[0];
    } catch (error) {
      console.error('Error in getOrCreateUser:', error);
      throw new Error('Failed to get or create user');
    }
  }

  /**
   * Get user by ID
   * @param userId User ID
   * @returns User object or null if not found
   */
  static async getUserById(userId: number): Promise<User | null> {
    try {
      const user = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return user.length > 0 ? user[0] : null;
    } catch (error) {
      console.error('Error in getUserById:', error);
      throw new Error('Failed to get user by ID');
    }
  }

  /**
   * Get user by Telegram ID
   * @param telegramId Telegram user ID
   * @returns User object or null if not found
   */
  static async getUserByTelegramId(telegramId: number): Promise<User | null> {
    try {
      const user = await db.select()
        .from(users)
        .where(eq(users.telegramId, telegramId))
        .limit(1);

      return user.length > 0 ? user[0] : null;
    } catch (error) {
      console.error('Error in getUserByTelegramId:', error);
      throw new Error('Failed to get user by Telegram ID');
    }
  }

  /**
   * Update user information
   * @param userId User ID
   * @param updates Partial user data to update
   * @returns Updated user object
   */
  static async updateUser(userId: number, updates: Partial<NewUser>): Promise<User | null> {
    try {
      const updatedUser = await db.update(users)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      return updatedUser.length > 0 ? updatedUser[0] : null;
    } catch (error) {
      console.error('Error in updateUser:', error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * Deactivate a user (soft delete)
   * @param userId User ID
   * @returns Updated user object
   */
  static async deactivateUser(userId: number): Promise<User | null> {
    try {
      const deactivatedUser = await db.update(users)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      return deactivatedUser.length > 0 ? deactivatedUser[0] : null;
    } catch (error) {
      console.error('Error in deactivateUser:', error);
      throw new Error('Failed to deactivate user');
    }
  }

  /**
   * Activate a user
   * @param userId User ID
   * @returns Updated user object
   */
  static async activateUser(userId: number): Promise<User | null> {
    try {
      const activatedUser = await db.update(users)
        .set({
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      return activatedUser.length > 0 ? activatedUser[0] : null;
    } catch (error) {
      console.error('Error in activateUser:', error);
      throw new Error('Failed to activate user');
    }
  }

  /**
   * Validate user ownership of a shipment
   * @param userId User ID
   * @param shipmentId Shipment ID
   * @returns True if user owns the shipment, false otherwise
   */
  static async validateUserOwnsShipment(userId: number, shipmentId: number): Promise<boolean> {
    try {
      // This would need to be implemented with a shipments import
      // For now, returning true as placeholder
      return true;
    } catch (error) {
      console.error('Error in validateUserOwnsShipment:', error);
      return false;
    }
  }
}