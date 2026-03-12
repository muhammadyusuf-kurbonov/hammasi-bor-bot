import { db } from '../database';
import { users, sharedAccess } from '../database/schema';
import { eq, and, or } from 'drizzle-orm';
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

  /**
   * Grant share access to another user
   * @param ownerId The user ID who owns the records
   * @param sharedWithTelegramId The Telegram ID of the user to share with
   * @returns The created shared access record or null if failed
   */
  static async grantShareAccess(ownerId: number, sharedWithTelegramId: number): Promise<{ success: boolean; message: string }> {
    try {
      // Get the user to share with
      const targetUser = await this.getUserByTelegramId(sharedWithTelegramId);
      if (!targetUser) {
        return { success: false, message: 'Foydalanuvchi topilmadi' };
      }

      if (targetUser.id === ownerId) {
        return { success: false, message: 'Ozingiz bilan ulashish mumkin emas' };
      }

      // Check if already shared
      const existingShare = await db.select()
        .from(sharedAccess)
        .where(
          and(
            eq(sharedAccess.ownerId, ownerId),
            eq(sharedAccess.sharedWithId, targetUser.id)
          )
        )
        .limit(1);

      if (existingShare.length > 0) {
        return { success: false, message: 'Bu foydalanuvchi allaqachon ulashilgan' };
      }

      // Create share access
      await db.insert(sharedAccess).values({
        ownerId,
        sharedWithId: targetUser.id,
      });

      return { success: true, message: 'Muvaffaqiyatli ulashildi!' };
    } catch (error) {
      console.error('Error in grantShareAccess:', error);
      return { success: false, message: 'Xatolik yuz berdi' };
    }
  }

  /**
   * Revoke share access from another user
   * @param ownerId The user ID who owns the records
   * @param sharedWithTelegramId The Telegram ID of the user to unshare with
   * @returns Success status
   */
  static async revokeShareAccess(ownerId: number, sharedWithTelegramId: number): Promise<{ success: boolean; message: string }> {
    try {
      // Get the user to unshare with
      const targetUser = await this.getUserByTelegramId(sharedWithTelegramId);
      if (!targetUser) {
        return { success: false, message: 'Foydalanuvchi topilmadi' };
      }

      // Delete share access
      const result = await db.delete(sharedAccess)
        .where(
          and(
            eq(sharedAccess.ownerId, ownerId),
            eq(sharedAccess.sharedWithId, targetUser.id)
          )
        );

      if (result.rowCount === 0) {
        return { success: false, message: 'Bu foydalanuvchi bilan ulashish yo\'q' };
      }

      return { success: true, message: 'Ulashish bekor qilindi!' };
    } catch (error) {
      console.error('Error in revokeShareAccess:', error);
      return { success: false, message: 'Xatolik yuz berdi' };
    }
  }

  /**
   * Get list of users who have access to current user's records
   * @param ownerId The user ID who owns the records
   * @returns Array of users who can see the owner's records
   */
  static async getSharedWithUsers(ownerId: number): Promise<User[]> {
    try {
      const sharedUsers = await db.select({ user: users })
        .from(sharedAccess)
        .innerJoin(users, eq(sharedAccess.sharedWithId, users.id))
        .where(eq(sharedAccess.ownerId, ownerId));

      return sharedUsers.map(s => s.user);
    } catch (error) {
      console.error('Error in getSharedWithUsers:', error);
      return [];
    }
  }

  /**
   * Get list of user IDs whose records current user can see
   * @param userId The user ID who wants to see others' records
   * @returns Array of owner user IDs
   */
  static async getAccessibleOwnerIds(userId: number): Promise<number[]> {
    try {
      const sharedRecords = await db.select()
        .from(sharedAccess)
        .where(eq(sharedAccess.sharedWithId, userId));

      return sharedRecords.map(r => r.ownerId);
    } catch (error) {
      console.error('Error in getAccessibleOwnerIds:', error);
      return [];
    }
  }
}