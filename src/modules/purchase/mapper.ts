import { PaymentMethod } from '../../shared/types/index.js';
import { ValidationError } from '../../shared/utils/validation.js';
import {
  normalizeString,
  toDateUTC,
  toMoney,
  toNonNegativeInteger,
  toPositiveInteger,
} from '../../shared/utils/parsers.js';
import { CreatePurchaseDTO, PurchaseItemInput } from './types.js';

const PAYMENT_METHODS = new Set<string>(Object.values(PaymentMethod));

export function mapCreatePurchaseDTO(payload: any): CreatePurchaseDTO {
  const fieldErrors: Record<string, string> = {};

  const supplierResult = normalizeString(payload?.supplierId, {
    fieldLabel: 'Supplier',
    required: true,
  });
  if (supplierResult.error) {
    fieldErrors.supplierId = supplierResult.error;
  }

  const supplierInvoiceResult = normalizeString(payload?.supplierInvoiceNumber, {
    fieldLabel: 'Supplier invoice',
  });

  const orderDateResult = toDateUTC(payload?.orderDate ?? new Date(), {
    fieldLabel: 'Order date',
    required: true,
  });
  if (orderDateResult.error) {
    fieldErrors.orderDate = orderDateResult.error;
  }

  const expectedDeliveryResult = toDateUTC(payload?.expectedDeliveryDate, {
    fieldLabel: 'Expected delivery date',
  });
  if (expectedDeliveryResult.error) {
    fieldErrors.expectedDeliveryDate = expectedDeliveryResult.error;
  }

  const discountResult = toMoney(payload?.discount, {
    fieldLabel: 'Discount',
  });
  if (discountResult.error) {
    fieldErrors.discount = discountResult.error;
  }

  const taxResult = toMoney(payload?.tax, {
    fieldLabel: 'Tax',
  });
  if (taxResult.error) {
    fieldErrors.tax = taxResult.error;
  }

  const amountPaidResult = toMoney(payload?.amountPaid, {
    fieldLabel: 'Amount paid',
  });
  if (amountPaidResult.error) {
    fieldErrors.amountPaid = amountPaidResult.error;
  }

  const notesResult = normalizeString(payload?.notes, {
    fieldLabel: 'Notes',
  });
  if (notesResult.error) {
    fieldErrors.notes = notesResult.error;
  }

  const rawItems = Array.isArray(payload?.items) ? payload.items : [];
  if (!Array.isArray(payload?.items) || rawItems.length === 0) {
    fieldErrors.items = 'At least one medicine line is required';
  }

  const normalizedItems: PurchaseItemInput[] = [];

  rawItems.forEach((item: any, index: number) => {
    const prefix = `items.${index}`;

    if (!item || typeof item !== 'object') {
      fieldErrors[prefix] = 'Invalid line item payload';
      return;
    }

    const medicineIdResult = normalizeString(item.medicineId, {
      fieldLabel: 'Medicine',
      required: true,
    });
    if (medicineIdResult.error) {
      fieldErrors[`${prefix}.medicineId`] = medicineIdResult.error;
    }

    const batchResult = normalizeString(item.batchNumber, {
      fieldLabel: 'Batch number',
      required: true,
    });
    if (batchResult.error) {
      fieldErrors[`${prefix}.batchNumber`] = batchResult.error;
    }

    const quantityResult = toPositiveInteger(item.quantity, {
      fieldLabel: 'Quantity',
    });
    if (quantityResult.error) {
      fieldErrors[`${prefix}.quantity`] = quantityResult.error;
    }

    const freeQuantityResult = toNonNegativeInteger(item.freeQuantity, {
      fieldLabel: 'Free quantity',
    });
    if (freeQuantityResult.error) {
      fieldErrors[`${prefix}.freeQuantity`] = freeQuantityResult.error;
    }

    const purchasePriceResult = toMoney(item.purchasePrice, {
      fieldLabel: 'Purchase price',
    });
    if (purchasePriceResult.error) {
      fieldErrors[`${prefix}.purchasePrice`] = purchasePriceResult.error;
    }

    const sellingPriceResult = toMoney(item.sellingPrice, {
      fieldLabel: 'Selling price',
    });
    if (sellingPriceResult.error) {
      fieldErrors[`${prefix}.sellingPrice`] = sellingPriceResult.error;
    }

    const mrpResult = toMoney(item.mrp, {
      fieldLabel: 'MRP',
    });
    if (mrpResult.error) {
      fieldErrors[`${prefix}.mrp`] = mrpResult.error;
    }

    const expiryDateResult = toDateUTC(item.expiryDate, {
      fieldLabel: 'Expiry date',
      required: true,
    });
    if (expiryDateResult.error) {
      fieldErrors[`${prefix}.expiryDate`] = expiryDateResult.error;
    }

    const alertThresholdResult = toNonNegativeInteger(item.alertThreshold, {
      fieldLabel: 'Alert threshold',
    });
    if (alertThresholdResult.error) {
      fieldErrors[`${prefix}.alertThreshold`] = alertThresholdResult.error;
    }

    const notesItemResult = normalizeString(item.notes, {
      fieldLabel: 'Item notes',
    });
    if (notesItemResult.error) {
      fieldErrors[`${prefix}.notes`] = notesItemResult.error;
    }

    if (
      !medicineIdResult.error &&
      !batchResult.error &&
      !quantityResult.error &&
      !purchasePriceResult.error &&
      !sellingPriceResult.error &&
      !mrpResult.error &&
      !expiryDateResult.error &&
      !freeQuantityResult.error &&
      !alertThresholdResult.error
    ) {
      normalizedItems.push({
        medicineId: medicineIdResult.value!,
        batchNumber: batchResult.value!,
        quantity: quantityResult.value!,
        freeQuantity: freeQuantityResult.value ?? 0,
        purchasePrice: purchasePriceResult.value!,
        sellingPrice: sellingPriceResult.value!,
        mrp: mrpResult.value!,
        expiryDate: expiryDateResult.value!,
        alertThreshold: alertThresholdResult.value ?? undefined,
        notes: notesItemResult.value,
      });
    }
  });

  let initialPaymentMethod: PaymentMethod | undefined;
  if (payload?.initialPaymentMethod) {
    const method = String(payload.initialPaymentMethod).toLowerCase();
    if (!PAYMENT_METHODS.has(method)) {
      fieldErrors.initialPaymentMethod = 'Payment method is not supported';
    } else {
      initialPaymentMethod = method as PaymentMethod;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError(fieldErrors, { context: 'purchase.create' });
  }

  const amountPaid = amountPaidResult.value ?? 0;

  return {
    supplierId: supplierResult.value!,
    supplierInvoiceNumber: supplierInvoiceResult.value,
    orderDate: orderDateResult.value,
    expectedDeliveryDate: expectedDeliveryResult.value,
    items: normalizedItems,
    discount: discountResult.value ?? 0,
    tax: taxResult.value ?? 0,
    amountPaid,
    initialPaymentMethod: amountPaid > 0 ? initialPaymentMethod : undefined,
    notes: notesResult.value,
  };
}

export default {
  mapCreatePurchaseDTO,
};

