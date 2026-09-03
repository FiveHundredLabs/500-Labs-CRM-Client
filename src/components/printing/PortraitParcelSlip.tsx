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

/**
 * Return ALL item lines.
 *
 * Important:
 * Do not slice the list and do not replace additional products
 * with "+ X more items".
 */
const summarizeSlipItems = (
  items: ParcelSlipItem[] | undefined,
  fallbackDescription: string,
  teamCode?: string,
  teamName?: string,
): string[] => {
  if (items && items.length > 0) {
    return items.map((item) => {
      const name = formatItemName(
        item.productName,
        teamCode,
        teamName,
      );

      return `${name} × ${item.quantity}`;
    });
  }

  const fallback = fallbackDescription?.trim() || 'Package';

  return [
    formatItemName(
      fallback,
      teamCode,
      teamName,
    ),
  ];
};

const getSlipPaymentLabel = (data: ParcelSlipData): string => {
  if (data.paymentMethod && data.paymentMethod.trim()) {
    return data.paymentMethod.trim().toUpperCase();
  }

  return 'COD';
};

const isCodPayment = (data: ParcelSlipData): boolean => {
  const label = getSlipPaymentLabel(data);

  return (
    label === 'COD' ||
    label.includes('COD') ||
    label.includes('COLLECT')
  );
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
> = ({
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

  const itemLines = summarizeSlipItems(
    data.items,
    data.itemsDescription,
    data.team.code,
    data.team.name,
  );

  const paymentMethodLabel = getSlipPaymentLabel(data);
  const isCod = isCodPayment(data);

  const codAmount = formatCurrency(
    data.codAmount ?? data.totalAmount,
  );

  const senderAddress = formatAddress(data.team.address);

  const consigneeAddress = formatAddress(
    data.customer.address,
  );

  /*
   * Consignee density.
   */
  const addressLength = consigneeAddress.length;

  const consigneeAddressFontSize =
    addressLength > 95
      ? '7pt'
      : addressLength > 65
        ? '7.5pt'
        : '8pt';

  /*
   * Item density.
   *
   * The item area still grows naturally, but slightly reducing
   * text/gap for larger orders gives the sender area more room
   * while remaining readable when printed.
   */
  const itemCount = itemLines.length;

  const itemFontSize =
    itemCount >= 8
      ? '6.5pt'
      : itemCount >= 6
        ? '7pt'
        : itemCount >= 4
          ? '7.5pt'
          : '8pt';

  const itemLineHeight =
    itemCount >= 8
      ? 1.1
      : itemCount >= 5
        ? 1.15
        : 1.2;

  const itemGap =
    itemCount >= 8
      ? '0.7mm'
      : itemCount >= 6
        ? '1mm'
        : '1.5mm';

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
            Tel: {data.customer.phone}
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
          {itemLines.map((line, idx) => (
            <div
              key={`${line}-${idx}`}
              style={{
                width: '100%',

                fontSize: itemFontSize,
                fontWeight: 600,
                lineHeight: itemLineHeight,

                whiteSpace: 'normal',

                overflowWrap: 'anywhere',
                wordBreak: 'normal',

                boxSizing: 'border-box',
              }}
            >
              {line}
            </div>
          ))}
        </div>

        {/* Payment Box */}
        <div
          className="payment-box"
          style={{
            height: '9mm',
            minHeight: '9mm',

            /*
             * Payment box always follows the final item.
             */
            marginTop: '3mm',

            border: '0.3mm solid #000000',

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
              fontSize: '12pt',
              fontWeight: 800,
              lineHeight: 1,

              textTransform: 'uppercase',

              letterSpacing: '0.04em',

              whiteSpace: 'nowrap',
            }}
          >
            {paymentMethodLabel}
          </span>

          <span
            style={{
              fontSize: '14pt',
              fontWeight: 900,
              lineHeight: 1,

              whiteSpace: 'nowrap',

              textAlign: 'right',
            }}
          >
            {codAmount}
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

          {data.team.contactEmail && (
            <div
              style={{
                fontWeight: 700,

                overflowWrap: 'anywhere',
                wordBreak: 'break-all',
              }}
            >
              Email: {data.team.contactEmail}
            </div>
          )}
        </div>
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

        {isCod && (
          <span
            style={{
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
            }}
          >
            COLLECT COD ON DELIVERY
          </span>
        )}
      </footer>
    </article>
  );
};