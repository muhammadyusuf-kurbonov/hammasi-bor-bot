import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/options';
import { db } from '@/db';
import { shipments, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const mockShipments = [
  {
    id: 1,
    trackNumber: "CN1234567890",
    goodPrice: "150.00",
    shipmentPrice: "450000",
    status: "shipped",
    isPaid: true,
    description: "Electronics - Phone case",
    notes: "Fragile - Handle with care",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-18T14:20:00Z",
    ownerUsername: "john_doe",
    ownerFirstName: "John",
    ownerLastName: "Doe"
  },
  {
    id: 2,
    trackNumber: "CN9876543210",
    goodPrice: "89.50",
    shipmentPrice: "280000",
    status: "pending",
    isPaid: false,
    description: "Clothing - Winter jacket",
    notes: null,
    createdAt: "2024-01-20T08:15:00Z",
    updatedAt: "2024-01-20T08:15:00Z",
    ownerUsername: "john_doe",
    ownerFirstName: "John",
    ownerLastName: "Doe"
  },
  {
    id: 3,
    trackNumber: "CN5555666677",
    goodPrice: "299.00",
    shipmentPrice: "850000",
    status: "delivered",
    isPaid: true,
    description: "Electronics - Wireless earbuds",
    notes: "Gift for friend",
    createdAt: "2024-01-10T16:45:00Z",
    updatedAt: "2024-01-22T09:00:00Z",
    ownerUsername: "john_doe",
    ownerFirstName: "John",
    ownerLastName: "Doe"
  },
  {
    id: 4,
    trackNumber: "CN1111222233",
    goodPrice: "45.00",
    shipmentPrice: "150000",
    status: "paid",
    isPaid: true,
    description: "Accessories - Watch band",
    notes: null,
    createdAt: "2024-01-25T11:00:00Z",
    updatedAt: "2024-01-26T15:30:00Z",
    ownerUsername: "john_doe",
    ownerFirstName: "John",
    ownerLastName: "Doe"
  },
  {
    id: 5,
    trackNumber: "CN4444555566",
    goodPrice: "199.99",
    shipmentPrice: "620000",
    status: "shipped",
    isPaid: true,
    description: "Beauty - Skincare set",
    notes: "Keep away from heat",
    createdAt: "2024-01-28T13:20:00Z",
    updatedAt: "2024-01-29T10:00:00Z",
    ownerUsername: "jane_smith",
    ownerFirstName: "Jane",
    ownerLastName: "Smith"
  },
  {
    id: 6,
    trackNumber: "CN7777888899",
    goodPrice: "75.00",
    shipmentPrice: "220000",
    status: "pending",
    isPaid: false,
    description: "Books - Programming guides",
    notes: null,
    createdAt: "2024-01-30T09:00:00Z",
    updatedAt: "2024-01-30T09:00:00Z",
    ownerUsername: "alex_dev",
    ownerFirstName: "Alex",
    ownerLastName: null
  },
];

export async function GET() {
  if (process.env.USE_MOCK_DATA === 'true') {
    return NextResponse.json(mockShipments);
  }

  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const userShipments = await db.select({
      id: shipments.id,
      trackNumber: shipments.trackNumber,
      goodPrice: shipments.goodPrice,
      shipmentPrice: shipments.shipmentPrice,
      status: shipments.status,
      isPaid: shipments.isPaid,
      description: shipments.description,
      notes: shipments.notes,
      createdAt: shipments.createdAt,
      updatedAt: shipments.updatedAt,
      ownerUsername: users.username,
      ownerFirstName: users.firstName,
      ownerLastName: users.lastName,
    })
    .from(shipments)
    .leftJoin(users, eq(shipments.ownerId, users.id))
    .where(eq(shipments.ownerId, userId));

    return NextResponse.json(userShipments);
  } catch (error) {
    console.error('Error fetching shipments:', error);
    return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 });
  }
}