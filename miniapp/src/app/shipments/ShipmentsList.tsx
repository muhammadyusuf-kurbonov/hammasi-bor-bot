"use client";

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useTelegram } from '@/app/TelegramProvider';

type Shipment = {
  id: number;
  trackNumber: string;
  goodPrice: string;
  shipmentPrice: string | null;
  status: string;
  isPaid: boolean;
  description: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  ownerUsername: string | null;
  ownerFirstName: string | null;
  ownerLastName: string | null;
};

export default function ShipmentsList() {
  const { data: session, status } = useSession();
  const { isInTelegram } = useTelegram();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/shipments')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch shipments');
        return res.json();
      })
      .then((data) => {
        setShipments(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'paid':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPrice = (price: string | null, currency: string) => {
    if (!price) return '-';
    return `${Number(price).toLocaleString()} ${currency}`;
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
  
  if (error) return (
    <div className="p-4 text-center text-red-500 bg-red-50 rounded-lg m-4">
      Error: {error}
    </div>
  );

  if (shipments.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p className="text-gray-500">No shipments found</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-3 pb-20">
      {shipments.map((shipment) => (
        <div 
          key={shipment.id} 
          className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-semibold text-gray-900">{shipment.trackNumber}</p>
              {shipment.description && (
                <p className="text-sm text-gray-500 mt-1">{shipment.description}</p>
              )}
            </div>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(shipment.status)}`}>
              {shipment.status}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm mt-3">
            <div>
              <p className="text-gray-500">Good Price</p>
              <p className="font-medium">{formatPrice(shipment.goodPrice, 'CNY')}</p>
            </div>
            <div>
              <p className="text-gray-500">Shipment</p>
              <p className="font-medium">{formatPrice(shipment.shipmentPrice, 'UZS')}</p>
            </div>
            <div>
              <p className="text-gray-500">Paid</p>
              <p className={`font-medium ${shipment.isPaid ? 'text-green-600' : 'text-red-600'}`}>
                {shipment.isPaid ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Date</p>
              <p className="font-medium">{new Date(shipment.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {shipment.notes && (
            <div className="mt-2 pt-2 border-t text-sm">
              <p className="text-gray-500">Notes: {shipment.notes}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}