import { and, eq, desc, ilike, sql, or } from 'drizzle-orm';
import { db } from '../database';
import { shipments, users, sharedAccess } from '../database/schema';
import type { ShipmentData } from '../types/bot';

export class ShipmentService {
  // Get user's shipments with pagination (including shared)
  static async getUserShipments(userId: number, page = 0, pageSize = 5) {
    // Get IDs of users who shared their shipments with this user
    const sharedWithMe = await db
      .select({ ownerId: sharedAccess.ownerId })
      .from(sharedAccess)
      .where(eq(sharedAccess.sharedWithId, userId));

    const accessibleUserIds = [userId, ...sharedWithMe.map(s => s.ownerId)];

    const items = await db
      .select()
      .from(shipments)
      .where(or(
        eq(shipments.ownerId, userId),
        ...sharedWithMe.map(s => eq(shipments.ownerId, s.ownerId))
      ))
      .orderBy(desc(shipments.createdAt))
      .limit(pageSize)
      .offset(page * pageSize);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(shipments)
      .where(or(
        eq(shipments.ownerId, userId),
        ...sharedWithMe.map(s => eq(shipments.ownerId, s.ownerId))
      ));

    return { items, total: count };
  }

  // Helper: get accessible user IDs (own + shared with me)
  static async getAccessibleUserIds(userId: number): Promise<number[]> {
    const sharedWithMe = await db
      .select({ ownerId: sharedAccess.ownerId })
      .from(sharedAccess)
      .where(eq(sharedAccess.sharedWithId, userId));

    return [userId, ...sharedWithMe.map(s => s.ownerId)];
  }

  // Get single shipment by ID and user ID (including shared)
  static async getShipmentById(shipmentId: number, userId: number) {
    const accessibleUserIds = await this.getAccessibleUserIds(userId);
    
    const result = await db
      .select()
      .from(shipments)
      .where(
        and(
          eq(shipments.id, shipmentId),
          or(...accessibleUserIds.map(id => eq(shipments.ownerId, id)))
        )
      )
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
  }

  // Get shipment by track number and user ID (including shared)
  static async getShipmentByTrackNumber(trackNumber: string, userId: number) {
    const accessibleUserIds = await this.getAccessibleUserIds(userId);
    
    const result = await db
      .select()
      .from(shipments)
      .where(
        and(
          eq(shipments.trackNumber, trackNumber),
          or(...accessibleUserIds.map(id => eq(shipments.ownerId, id)))
        )
      )
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
  }

  // Search shipments by name (case-insensitive, partial match) with pagination (including shared)
  static async searchByName(query: string, userId: number, page = 0, pageSize = 5) {
    const accessibleUserIds = await this.getAccessibleUserIds(userId);
    
    const where = and(
      or(...accessibleUserIds.map(id => eq(shipments.ownerId, id))),
      ilike(shipments.description, `%${query}%`)
    );

    const items = await db
      .select()
      .from(shipments)
      .where(where)
      .orderBy(desc(shipments.createdAt))
      .limit(pageSize)
      .offset(page * pageSize);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(shipments)
      .where(where);

    return { items, total: count };
  }

  // Create new shipment
  static async createShipment(data: Omit<ShipmentData, 'id'>) {
    const result = await db
      .insert(shipments)
      .values({
        trackNumber: data.trackNumber,
        goodPrice: data.goodPrice.toString(),
        shipmentPrice: data.shipmentPrice?.toString() || null,
        status: data.status,
        ownerId: data.ownerId!,
        isPaid: data.isPaid,
        description: data.description,
        notes: data.notes,
      })
      .returning();
    
    return result[0];
  }

  // Update shipment (only own shipments)
  static async updateShipment(shipmentId: number, userId: number, data: Partial<ShipmentData>) {
    const existing = await this.getShipmentById(shipmentId, userId);
    if (!existing) {
      throw new Error('Shipment not found or access denied');
    }

    // Can only edit own shipments, not shared ones
    if (existing.ownerId !== userId) {
      throw new Error('Can only edit your own shipments');
    }

    const updateData: any = {};
    
    if (data.trackNumber !== undefined) {
      // Check if new track number already exists for this user (excluding current shipment)
      const existingWithTrack = await this.getShipmentByTrackNumber(data.trackNumber, userId);
      if (existingWithTrack && existingWithTrack.id !== shipmentId) {
        throw new Error('This track number already exists for your account');
      }
      updateData.trackNumber = data.trackNumber;
    }
    
    if (data.goodPrice !== undefined) {
      updateData.goodPrice = data.goodPrice.toString();
    }
    
    if (data.shipmentPrice !== undefined) {
      updateData.shipmentPrice = data.shipmentPrice?.toString() || null;
    }
    
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    
    if (data.isPaid !== undefined) {
      updateData.isPaid = data.isPaid;
    }
    
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    const result = await db
      .update(shipments)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, shipmentId))
      .returning();
    
    return result[0];
  }

  // Delete shipment (only own shipments)
  static async deleteShipment(shipmentId: number, userId: number) {
    const existing = await this.getShipmentById(shipmentId, userId);
    if (!existing) {
      throw new Error('Shipment not found or access denied');
    }

    // Can only delete own shipments, not shared ones
    if (existing.ownerId !== userId) {
      throw new Error('Can only delete your own shipments');
    }

    await db
      .delete(shipments)
      .where(eq(shipments.id, shipmentId));
    
    return true;
  }

  // Check if track number exists for user (excluding specific shipment ID for updates)
  static async trackNumberExists(trackNumber: string, userId: number, excludeShipmentId?: number) {
    let whereCondition = and(
      eq(shipments.trackNumber, trackNumber),
      eq(shipments.ownerId, userId)
    );
    
    if (excludeShipmentId) {
      whereCondition = and(whereCondition, eq(shipments.id, excludeShipmentId));
    }
    
    const result = await db
      .select()
      .from(shipments)
      .where(whereCondition)
      .limit(1);
    
    return result.length > 0;
  }
}