import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../../lib/apiClient';
import { PortraitParcelSlip } from '../../components/printing/PortraitParcelSlip';
import { PortraitParcelSlipPrintSheet } from '../../components/printing/PortraitParcelSlipPrintSheet';
import { ParcelSlipData } from '../../models/domain';

const setRobotsNoIndex = () => {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'robots';
    document.head.appendChild(meta);
  }
  meta.content = 'noindex,nofollow';
};

const TEST_PARCEL_SLIP: ParcelSlipData = {
  publicSlipToken: 'demo-token-001',
  orderNumber: 'ORD-2026-0001',
  orderDate: '2026-08-30T00:00:00.000Z',
  itemsDescription: 'Easy Method English - Adult × 1, Easy Method English - Kids × 1',
  paymentMethod: 'COD',
  codAmount: 9500,
  totalAmount: 9500,
  currency: 'LKR',
  contactCode: 'CTC-001',
  customer: {
    fullName: 'Ranjan',
    address: 'Maradana\nColombo 3',
    phone: '0771234567',
    contactCode: 'CTC-001',
  },
  team: {
    name: 'Easy Method English',
    code: 'EME',
    logo: null,
    address: 'No. 123, Galle Road, Colombo 03',
    contactPhone: '0112345678',
    contactEmail: 'support@levelgrow.lk',
  },
  items: [
    { productName: 'Adult', quantity: 1 },
    { productName: 'Kids', quantity: 1 },
  ],
};

const FOUR_TEST_PARCEL_SLIPS: ParcelSlipData[] = [
  TEST_PARCEL_SLIP,
  {
    ...TEST_PARCEL_SLIP,
    publicSlipToken: 'demo-token-002',
    orderNumber: 'ORD-2026-0002',
    contactCode: 'CTC-002',
    customer: {
      fullName: 'Kusal Perera',
      address: 'Kandy Road\nKiribathgoda',
      phone: '0719876543',
      contactCode: 'CTC-002',
    },
    codAmount: 4750,
    totalAmount: 4750,
    items: [{ productName: 'Adult', quantity: 1 }],
  },
  {
    ...TEST_PARCEL_SLIP,
    publicSlipToken: 'demo-token-003',
    orderNumber: 'ORD-2026-0003',
    contactCode: 'CTC-003',
    customer: {
      fullName: 'Chamari Silva',
      address: 'Galle Road\nMatara',
      phone: '0754321987',
      contactCode: 'CTC-003',
    },
    codAmount: 9500,
    totalAmount: 9500,
    items: [
      { productName: 'Adult', quantity: 1 },
      { productName: 'Kids', quantity: 1 },
    ],
  },
  {
    ...TEST_PARCEL_SLIP,
    publicSlipToken: 'demo-token-004',
    orderNumber: 'ORD-2026-0004',
    contactCode: 'CTC-004',
    customer: {
      fullName: 'Dinesh Fernando',
      address: 'Main Street\nNegombo',
      phone: '0761122334',
      contactCode: 'CTC-004',
    },
    codAmount: 14250,
    totalAmount: 14250,
    items: [
      { productName: 'Adult', quantity: 2 },
      { productName: 'Kids', quantity: 1 },
    ],
  },
];

export const PublicParcelSlipPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [parcelSlip, setParcelSlip] = useState<ParcelSlipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    document.title = 'Parcel Slip';
    setRobotsNoIndex();
  }, []);

  useEffect(() => {
    const updateScale = () => {
      // 97mm in standard 96dpi pixels is ~366.6px.
      // Account for 32px safe outer padding.
      const availableWidth = window.innerWidth - 32;
      const baseWidthPx = 367;
      if (availableWidth < baseWidthPx) {
        setScale(availableWidth / baseWidthPx);
      } else {
        setScale(1);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadParcelSlip = async () => {
      if (!token) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (token === 'test' || token === 'demo' || token.startsWith('test-')) {
        if (isMounted) {
          setParcelSlip(TEST_PARCEL_SLIP);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setNotFound(false);

      try {
        const response = await apiClient.get<{ data: ParcelSlipData }>(
          `/public/parcel-slips/${encodeURIComponent(token)}`,
          { skipAuthRefresh: true },
        );
        if (isMounted) {
          setParcelSlip(response.data.data);
        }
      } catch {
        if (isMounted) {
          setParcelSlip(null);
          setNotFound(true);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadParcelSlip();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const is4Up = token === '4up' || token === 'sheet-test';

  if (is4Up) {
    return (
      <main className="min-h-screen bg-slate-200 p-6 flex flex-col items-center justify-start">
        <div className="mb-4 text-xs font-bold text-slate-700 uppercase tracking-wider no-print">
          A4 Portrait 4-Up Print Sheet Preview (198mm × 285mm, 4mm Gap, 97mm × 140.5mm Slips)
        </div>
        <div className="shadow-2xl bg-white">
          <PortraitParcelSlipPrintSheet items={FOUR_TEST_PARCEL_SLIPS} />
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-slate-100 flex justify-center items-start"
      style={{
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div className="w-full flex justify-center items-start">
        {loading && (
          <div className="mt-20 text-sm font-semibold text-slate-700">Loading parcel slip...</div>
        )}

        {!loading && notFound && (
          <div className="mt-20 bg-white border border-slate-200 px-5 py-4 text-sm font-semibold text-slate-900 rounded-lg shadow-sm">
            Parcel slip not found
          </div>
        )}

        {!loading && parcelSlip && (
          <div
            className="public-parcel-slip-wrapper shadow-2xl bg-white"
            style={{
              width: scale < 1 ? `${367 * scale}px` : '97mm',
              height: scale < 1 ? `${531 * scale}px` : '140.5mm',
              position: 'relative',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                transform: scale < 1 ? `scale(${scale})` : 'none',
                transformOrigin: 'top left',
                width: '97mm',
                height: '140.5mm',
                boxSizing: 'border-box',
              }}
            >
              <PortraitParcelSlip data={parcelSlip} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
