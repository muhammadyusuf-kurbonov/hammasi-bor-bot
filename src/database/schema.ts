import { pgTable, serial, varchar, decimal, timestamp, boolean, integer, text, unique } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  telegramId: integer('telegram_id').unique().notNull(),
  username: varchar('username', { length: 100 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Shipments table
export const shipments = pgTable('shipments', {
  id: serial('id').primaryKey(),
  trackNumber: varchar('track_number', { length: 100 }).notNull(),
  goodPrice: decimal('good_price', { precision: 10, scale: 2 }).notNull(), // in CNY
  shipmentPrice: decimal('shipment_price', { precision: 10, scale: 2 }), // forwarded from shipment service
  status: varchar('status', { length: 50 }).default('pending'), // pending, shipped, delivered, paid
  ownerId: integer('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  isPaid: boolean('is_paid').default(false),
  description: text('description'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueTrackOwner: unique().on(table.trackNumber, table.ownerId),
}));

// Status history for tracking changes
export const statusHistory = pgTable('status_history', {
  id: serial('id').primaryKey(),
  shipmentId: integer('shipment_id').references(() => shipments.id, { onDelete: 'cascade' }).notNull(),
  oldStatus: varchar('old_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }).notNull(),
  changedBy: integer('changed_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Shipment = typeof shipments.$inferSelect;
export type NewShipment = typeof shipments.$inferInsert;
export type StatusHistory = typeof statusHistory.$inferSelect;
export type NewStatusHistory = typeof statusHistory.$inferInsert;