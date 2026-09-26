import React, { useEffect, useMemo, useState } from 'react';
import { ParcelSlipData, ParcelSlipItem } from '../../models/domain';
import { formatCurrency } from '../../utils/currency';
import {
  buildPublicParcelSlipUrl,
  generateParcelSlipQrDataUrl,
} from '../../utils/parcelSlipQr';

export interface PortraitParcelSlipProps {
  data: ParcelSlipData;
  qrImageDataUrl?: string;
  className?: string;
  style?: React.CSSProperties;
}

const formatAddress = (value?: string | null): string =>
  (value || '')
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');

const formatDate = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const formatItemName = (
  name: string,
  teamCode?: string,
  teamName?: string,
): string => {
  const isEme =
    (teamCode && teamCode.toUpperCase() === 'EME') ||
    (teamName &&
      teamName.toLowerCase().includes('easy method english'));

  const trimmed = name.trim();

  if (isEme) {
    if (!trimmed.toLowerCase().startsWith('easy method english')) {
      return `Easy Method English - ${trimmed}`;
    }
  }

  return trimmed;
};

export interface SlipPackageRow {
  name: string;
  priceFormatted: string;
}

/**
 * Return ALL package rows with their formatted prices.
 *
 * Important:
 * Do not slice the list and do not replace additional products
 * with "+ X more items".
 */
const resolveSlipPackages = (
  items: ParcelSlipItem[] | undefined,
  fallbackDescription: string,
  teamCode: string | undefined,
  teamName: string | undefined,
  productSalesValue: number | string | null | undefined,
  totalAmount: number | string,
  deliveryCharge: number,
): SlipPackageRow[] => {
  if (items && items.length > 0) {
    return items.map((item) => {
      const formattedName = formatItemName(
        item.productName,
        teamCode,
        teamName,
      );
      const name =
        item.quantity > 1
          ? `${formattedName} × ${item.quantity}`
          : `${formattedName} × 1`;

      let price = 0;
      if (item.price !== undefined && item.price !== null) {
        price = Number(item.price);
      } else if (item.subtotal !== undefined && item.subtotal !== null) {
        price = Number(item.subtotal);
      } else if (item.unitPrice !== undefined && item.unitPrice !== null) {
        price = Number(item.unitPrice) * (Number(item.quantity) || 1);
      } else if (items.length === 1) {
        price = Number(
          productSalesValue ??
            Math.max(0, Number(totalAmount) - deliveryCharge),
        );
      }

      if (!Number.isFinite(price) || isNaN(price)) {
        price = 0;
      }

      return {
        name,
        priceFormatted: formatCurrency(price),
      };
    });
  }

  const fallback = fallbackDescription?.trim() || 'Package';
  const name = formatItemName(fallback, teamCode, teamName);
  let price = Number(
    productSalesValue ??
      Math.max(0, Number(totalAmount) - deliveryCharge),
  );
  if (!Number.isFinite(price) || isNaN(price)) {
    price = 0;
  }

  return [
    {
      name,
      priceFormatted: formatCurrency(price),
    },
  ];
};

const isCashOnHandSlip = (data: ParcelSlipData): boolean => {
  if (data.isCashOnHand === true) return true;
  if (data.deliveryMethod === 'CASH_ON_HAND') return true;
  const pm = (data.paymentMethod || '').trim().toUpperCase();
  if (pm === 'CASH_ON_HAND' || pm === 'CASH ON HAND') return true;
  if (
    Number(data.deliveryCharge ?? data.codCharge ?? 0) === 0 &&
    Number(data.codAmount ?? 0) === 0
  ) {
    return true;
  }
  return false;
};

export const SlipSectionHeader: React.FC<{
  title: string;
  className?: string;
}> = ({
  title,
  className = '',
}) => (
  <div
    className={`slip-section-header ${className}`}
    style={{
      height: '6mm',
      minHeight: '5mm',
      flexShrink: 0,

      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',

      padding: '0 2.5mm',

      backgroundColor: '#000000',
      color: '#ffffff',

      fontSize: '9pt',
      fontWeight: 800,
      lineHeight: 1,

      boxSizing: 'border-box',

      textTransform: 'uppercase',
      letterSpacing: '0.04em',

      userSelect: 'none',

      printColorAdjust: 'exact',
      WebkitPrintColorAdjust: 'exact',
    }}
  >
    <span>{title}</span>
  </div>
);

export const PortraitParcelSlip: React.FC<
  PortraitParcelSlipProps
> = React.memo(({
  data,
  qrImageDataUrl,
  className = '',
  style,
}) => {
  const qrValue = useMemo(
    () => buildPublicParcelSlipUrl(data.publicSlipToken),
    [data.publicSlipToken],
  );

  const [generatedQr, setGeneratedQr] = useState<
    string | undefined
  >(qrImageDataUrl);

  useEffect(() => {
    let isMounted = true;

    if (qrImageDataUrl) {
      setGeneratedQr(qrImageDataUrl);

      return () => {
        isMounted = false;
      };
    }

    generateParcelSlipQrDataUrl(qrValue)
      .then((dataUrl) => {
        if (isMounted) {
          setGeneratedQr(dataUrl);
        }
      })
      .catch(() => {
        if (isMounted) {
          setGeneratedQr(undefined);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [qrImageDataUrl, qrValue]);

  const isCashOnHand = isCashOnHandSlip(data);
  const deliveryCharge = isCashOnHand
    ? 0
    : Math.max(0, Number(data.deliveryCharge ?? data.codCharge ?? 0));
  const finalCodAmount = isCashOnHand
    ? 0
    : Math.max(
        0,
        Number(data.codAmount ?? data.amountToCollect ?? data.totalAmount ?? 0),
      );

  const packageRows = resolveSlipPackages(
    data.items,
    data.itemsDescription,
    data.team.code,
    data.team.name,
    data.productSalesValue,
    data.totalAmount,
    deliveryCharge,
  );

  const deliveryChargeFormatted = formatCurrency(deliveryCharge);
  const codAmountFormatted = formatCurrency(finalCodAmount);

  const isCod = !isCashOnHand && finalCodAmount > 0;

  const contactCode =
    data.contactCode ||
    data.customer?.contactCode ||
    data.customer?.code ||
    (data as any)?.code ||
    '';

  const senderAddress = formatAddress(data.team.address);

  const consigneeAddress = formatAddress(
    data.customer.address,
  );

  const primaryPhone = data.customer?.phone?.trim() || '';
  const secondaryPhone = (
    data.customer?.secondaryMobile ||
    (data.customer as any)?.secondaryPhone ||
    ''
  ).trim();

  const customerPhones = [primaryPhone, secondaryPhone]
    .filter((phone, idx, arr) => Boolean(phone) && arr.indexOf(phone) === idx)
    .join(' / ');

  /*
   * Consignee density.
   */
  const addressLength = consigneeAddress.length;

  const consigneeAddressFontSize =
    addressLength > 90
      ? '7pt'
      : addressLength > 60
        ? '7.5pt'
        : '8pt';

  /*
   * Item density.
   *
   * The item area still grows naturally, but slightly reducing
   * text/gap for larger orders gives the sender area more room
   * while remaining readable when printed.
   */
  const rowCount = packageRows.length + 1;

  const itemFontSize =
    rowCount >= 8
      ? '6.5pt'
      : rowCount >= 6
        ? '7pt'
        : rowCount >= 4
          ? '7.5pt'
          : '8pt';

  const itemLineHeight =
    rowCount >= 8
      ? 1.1
      : rowCount >= 5
        ? 1.15
        : 1.2;

  const itemGap =
    rowCount >= 8
      ? '0.6mm'
      : rowCount >= 6
        ? '0.8mm'
        : '1.2mm';

  return (
    <article
      className={`portrait-parcel-slip parcel-slip ${className}`}
      style={{
        width: '97mm',
        height: '140.5mm',

        minWidth: '97mm',
        minHeight: '140.5mm',

        maxWidth: '97mm',
        maxHeight: '140.5mm',

        /*
         * IMPORTANT:
         * Use normal vertical flex flow instead of fixed grid rows.
         *
         * This allows the item section to grow naturally and push
         * the FROM section downward.
         */
        display: 'flex',
        flexDirection: 'column',

        backgroundColor: '#ffffff',
        color: '#000000',

        border: '0.35mm solid #000000',

        boxSizing: 'border-box',

        fontFamily: 'Arial, Helvetica, sans-serif',

        /*
         * The physical parcel cell must never exceed its allocated
         * 97 × 140.5 mm print area.
         */
        overflow: 'hidden',

        userSelect: 'none',

        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',

        ...style,
      }}
      data-public-slip-token={data.publicSlipToken}
    >
      {/* =========================================================
          1. HEADER — 21mm FIXED
         ========================================================= */}
      <header
        style={{
          height: '21mm',
          minHeight: '21mm',
          flexShrink: 0,

          display: 'grid',
          gridTemplateColumns: '64mm 1fr',

          borderBottom: '0.35mm solid #000000',

          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Left Brand Area — Logo Only */}
        <div
          style={{
            padding: '2.5mm',

            display: 'flex',

            justifyContent: 'center',
            alignItems: 'flex-start',

            boxSizing: 'border-box',

            overflow: 'hidden',

            minWidth: 0,
          }}
        >
          {data.team.logo && (
            <img
              src={data.team.logo}
              alt={data.team.name}
              style={{
                maxHeight: '16mm',
                maxWidth: '36mm',

                objectFit: 'contain',

                display: 'block',
              }}
            />
          )}
        </div>

        {/* Right Order Area */}
        <div
          style={{
            borderLeft: '0.35mm solid #000000',

            padding: '2.5mm',

            display: 'flex',
            flexDirection: 'column',

            justifyContent: 'center',

            textAlign: 'left',

            boxSizing: 'border-box',

            overflow: 'visible',

            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: '6.5pt',
              fontWeight: 700,
              lineHeight: 1.1,

              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            ORDER NO.
          </div>

          <div
            style={{
              fontSize: '8.5pt',
              fontWeight: 800,
              lineHeight: 1.15,

              whiteSpace: 'nowrap',
              overflow: 'visible',

              marginTop: '0.5mm',
            }}
          >
            {data.orderNumber}
          </div>

          <div
            style={{
              fontSize: '6.5pt',
              fontWeight: 700,
              lineHeight: 1.1,

              textTransform: 'uppercase',
              letterSpacing: '0.03em',

              marginTop: '2.5mm',
            }}
          >
            ORDER DATE
          </div>

          <div
            style={{
              fontSize: '8.5pt',
              fontWeight: 800,
              lineHeight: 1.15,

              whiteSpace: 'nowrap',
              overflow: 'visible',

              marginTop: '0.5mm',
            }}
          >
            {formatDate(data.orderDate)}
          </div>
        </div>
      </header>

      {/* =========================================================
          2. QR + CONSIGNEE — 31mm FIXED
         ========================================================= */}
      <div
        style={{
          height: '31mm',
          minHeight: '31mm',
          flexShrink: 0,

          display: 'grid',
          gridTemplateColumns: '30mm 1fr',

          borderBottom: '0.35mm solid #000000',

          boxSizing: 'border-box',

          overflow: 'hidden',
        }}
      >
        {/* QR Panel */}
        <div
          style={{
            borderRight: '0.35mm solid #000000',

            padding: '1.5mm',

            display: 'flex',
            flexDirection: 'column',

            alignItems: 'center',
            justifyContent: 'center',

            textAlign: 'center',

            boxSizing: 'border-box',

            overflow: 'hidden',
          }}
        >
          <div
            style={{
              fontSize: '6pt',
              fontWeight: 700,
              lineHeight: 1.05,

              textTransform: 'uppercase',
              textAlign: 'center',

              letterSpacing: '0.02em',
            }}
          >
            SCAN TO VIEW SLIP
          </div>

          <div
            style={{
              width: '21mm',
              height: '21mm',

              marginTop: '0.8mm',
              marginBottom: '0.8mm',

              display: 'flex',

              alignItems: 'center',
              justifyContent: 'center',

              boxSizing: 'border-box',
            }}
          >
            {generatedQr ? (
              <img
                src={generatedQr}
                alt="QR Code"
                style={{
                  width: '21mm',
                  height: '21mm',

                  objectFit: 'contain',

                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{
                  width: '21mm',
                  height: '21mm',

                  border: '0.3mm solid #000000',

                  display: 'flex',

                  alignItems: 'center',
                  justifyContent: 'center',

                  fontSize: '6pt',
                  fontWeight: 700,

                  boxSizing: 'border-box',
                }}
              >
                QR
              </div>
            )}
          </div>

          <div
            style={{
              fontSize: '6pt',
              fontWeight: 700,
              lineHeight: 1,

              textAlign: 'center',

              whiteSpace: 'nowrap',

              overflow: 'visible',
            }}
          >
            {data.orderNumber}
          </div>
        </div>

        {/* Consignee Panel */}
        <div
          style={{
            padding: '3mm',

            display: 'flex',
            flexDirection: 'column',

            justifyContent: 'flex-start',
            alignItems: 'flex-start',

            textAlign: 'left',

            boxSizing: 'border-box',

            minWidth: 0,

            overflow: 'hidden',
          }}
        >
          <div
            style={{
              fontSize: '7.5pt',
              fontWeight: 800,
              lineHeight: 1.1,

              textTransform: 'uppercase',
              letterSpacing: '0.02em',

              flexShrink: 0,
            }}
          >
            TO :
          </div>

          <div
            style={{
              fontSize: '11pt',
              fontWeight: 800,
              lineHeight: 1.15,

              marginTop: '1mm',

              whiteSpace: 'normal',

              overflowWrap: 'anywhere',
              wordBreak: 'normal',

              flexShrink: 0,
            }}
          >
            {data.customer.fullName}
          </div>

          <div
            style={{
              fontSize: consigneeAddressFontSize,
              lineHeight: 1.2,

              marginTop: '1.5mm',

              whiteSpace: 'normal',

              overflowWrap: 'anywhere',
              wordBreak: 'normal',
            }}
          >
            {consigneeAddress}
          </div>

          <div
            style={{
              fontSize: '8pt',
              fontWeight: 700,
              lineHeight: 1.2,

              marginTop: '1mm',

              whiteSpace: 'normal',

              overflowWrap: 'anywhere',
              wordBreak: 'normal',

              flexShrink: 0,
            }}
          >
            Tel: {customerPhones || '-'}
          </div>
        </div>
      </div>

      {/* =========================================================
          3. ITEM HEADER — 5mm FIXED
         ========================================================= */}
      <SlipSectionHeader title="ITEM / COD DETAILS" />

      {/* =========================================================
          4. ITEM BODY
          
          Minimum = 29mm.
          Grows automatically when more items exist.
          ========================================================= */}
      <div
        className="item-body"
        style={{
          minHeight: '29mm',

          /*
           * Never shrink this section below its actual content.
           * Additional item rows push FROM downward.
           */
          flexShrink: 0,

          padding: '3mm 2.5mm 2.5mm',

          display: 'flex',
          flexDirection: 'column',

          boxSizing: 'border-box',

          borderBottom: '0.35mm solid #000000',

          overflow: 'visible',
        }}
      >
        {/* All Items */}
        <div
          className="items-list"
          style={{
            display: 'flex',
            flexDirection: 'column',

            gap: itemGap,

            width: '100%',

            boxSizing: 'border-box',

            overflow: 'visible',

            flexShrink: 0,
          }}
        >
          {packageRows.map((pkg, idx) => (
            <div
              key={`${pkg.name}-${idx}`}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: '2mm',
                fontSize: itemFontSize,
                fontWeight: 600,
                lineHeight: itemLineHeight,
                boxSizing: 'border-box',
              }}
            >
              <span
                style={{
                  minWidth: 0,
                  whiteSpace: 'normal',
                  overflowWrap: 'anywhere',
                  wordBreak: 'normal',
                }}
              >
                {pkg.name}
              </span>
              <span
                style={{
                  flexShrink: 0,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                {pkg.priceFormatted}
              </span>
            </div>
          ))}

          {/* Delivery Charge Row */}
          <div
            className="delivery-charge-row"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: '2mm',
              fontSize: itemFontSize,
              fontWeight: 700,
              lineHeight: itemLineHeight,
              boxSizing: 'border-box',
            }}
          >
            <span
              style={{
                minWidth: 0,
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}
            >
              Delivery Charge
            </span>
            <span
              style={{
                flexShrink: 0,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'right',
                whiteSpace: 'nowrap',
              }}
            >
              {deliveryChargeFormatted}
            </span>
          </div>
        </div>

        {/* Large/Final COD Amount Box */}
        <div
          className="payment-box"
          style={{
            height: '9mm',
            minHeight: '9mm',
            marginTop: '2.5mm',
            border: '0.35mm solid #000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 2.5mm',
            boxSizing: 'border-box',
            backgroundColor: '#ffffff',
            flexShrink: 0,
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
          }}
        >
          <span
            style={{
              fontSize: '11pt',
              fontWeight: 800,
              lineHeight: 1,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
            }}
          >
            COD Amount
          </span>
          <span
            style={{
              fontSize: '14pt',
              fontWeight: 900,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {codAmountFormatted}
          </span>
        </div>
      </div>

      {/* =========================================================
          5. FROM HEADER — MOVES DOWN WITH ITEM BODY
         ========================================================= */}
      <SlipSectionHeader title="FROM" />

      {/* =========================================================
          6. SENDER BODY
          
          Normally receives 42mm.
          If item section grows, this section gives up space.
         ========================================================= */}
      <div
        className="sender-body"
        style={{
          /*
           * This is the flexible part of the slip.
           *
           * At normal item counts it naturally occupies the original
           * ~42mm area.
           *
           * When the item section becomes taller, this area becomes
           * smaller while the footer remains fixed.
           */
          flex: '1 1 42mm',

          minHeight: 0,

          padding: '3mm',

          display: 'flex',
          flexDirection: 'column',

          justifyContent: 'flex-start',
          alignItems: 'flex-start',

          boxSizing: 'border-box',

          overflow: 'hidden',

          minWidth: 0,

          position: 'relative',
        }}
      >
        <div
          style={{
            fontSize: '9pt',
            fontWeight: 800,
            lineHeight: 1.15,

            flexShrink: 0,
          }}
        >
          Level Grow (Pvt) Ltd
        </div>

        {senderAddress && (
          <div
            style={{
              fontSize: '7.5pt',
              lineHeight: 1.2,

              marginTop: '1.5mm',

              whiteSpace: 'normal',

              overflowWrap: 'anywhere',
              wordBreak: 'normal',
            }}
          >
            {senderAddress}
          </div>
        )}

        <div
          style={{
            marginTop: '1.5mm',

            display: 'flex',
            flexDirection: 'column',

            gap: '0.8mm',

            fontSize: '7.5pt',
            lineHeight: 1.2,

            flexShrink: 0,
          }}
        >
          {data.team.contactPhone && (
            <div
              style={{
                fontWeight: 700,
              }}
            >
              Tel: {data.team.contactPhone}
            </div>
          )}
        </div>

        {contactCode && (
          <div
            className="sender-contact-code"
            style={{
              position: 'absolute',
              right: '2.5mm',
              bottom: '2.5mm',

              fontSize: '8.5pt',
              fontWeight: 800,
              lineHeight: 1,

              letterSpacing: '0.03em',
              textTransform: 'uppercase',

              color: '#000000',
              backgroundColor: '#ffffff',
              padding: '0.6mm 1.5mm',
              border: '0.3mm solid #000000',

              boxSizing: 'border-box',
              whiteSpace: 'nowrap',

              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
            }}
          >
            {contactCode}
          </div>
        )}
      </div>

      {/* =========================================================
          7. FOOTER — 7.5mm FIXED
         ========================================================= */}
      <footer
        className="footer"
        style={{
          height: '7.5mm',
          minHeight: '7.5mm',

          flexShrink: 0,

          borderTop: '0.3mm solid #000000',

          display: 'flex',

          alignItems: 'center',
          justifyContent: 'space-between',

          padding: '0 2.5mm',

          boxSizing: 'border-box',

          backgroundColor: '#ffffff',

          fontSize: '6.5pt',
          fontWeight: 700,
          lineHeight: 1,

          textTransform: 'uppercase',

          overflow: 'hidden',

          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
        }}
      >
        <span
          style={{
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          ORDER REF: {data.orderNumber}
        </span>

        {isCod ? (
          <span
            style={{
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
            }}
          >
            COLLECT COD ON DELIVERY
          </span>
        ) : isCashOnHand ? (
          <span
            style={{
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
            }}
          >
            CASH ON HAND
          </span>
        ) : null}
      </footer>
    </article>
  );
});