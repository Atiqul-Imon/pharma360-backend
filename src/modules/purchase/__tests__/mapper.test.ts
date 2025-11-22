/* global describe, it, expect */
import { mapCreatePurchaseDTO } from '../mapper.js';
import { ValidationError } from '../../../shared/utils/validation.js';

describe('mapCreatePurchaseDTO', () => {
  it('normalizes monetary and numeric fields', () => {
    const dto = mapCreatePurchaseDTO({
      supplierId: '64b7b2c3d4e5f67890123456',
      orderDate: '2024-01-10',
      items: [
        {
          medicineId: '64b7b2c3d4e5f67890123457',
          batchNumber: ' BN-123 ',
          quantity: '5',
          freeQuantity: '1',
          purchasePrice: '120.567',
          sellingPrice: '150',
          mrp: '160',
          expiryDate: '2025-12-31',
        },
      ],
      discount: '10.255',
      tax: '5',
      amountPaid: '20',
      initialPaymentMethod: 'cash',
      notes: '  Urgent  ',
    });

    expect(dto.discount).toBeCloseTo(10.26, 2);
    expect(dto.items[0].batchNumber).toBe('BN-123');
    expect(dto.items[0].purchasePrice).toBeCloseTo(120.57, 2);
    expect(dto.items[0].freeQuantity).toBe(1);
    expect(dto.notes).toBe('Urgent');
    expect(dto.initialPaymentMethod).toBe('cash');
  });

  it('aggregates validation errors with field references', () => {
    expect(() =>
      mapCreatePurchaseDTO({
        supplierId: '',
        items: [
          {
            medicineId: '',
            batchNumber: '',
            quantity: 0,
            purchasePrice: -5,
            sellingPrice: 'abc',
            mrp: null,
            expiryDate: 'invalid-date',
          },
        ],
      })
    ).toThrowError(ValidationError);

    try {
      mapCreatePurchaseDTO({
        supplierId: '',
        items: [
          {
            medicineId: '',
            batchNumber: '',
            quantity: 0,
            purchasePrice: -5,
            sellingPrice: 'abc',
            mrp: null,
            expiryDate: 'invalid-date',
          },
        ],
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const validation = error as ValidationError;
      expect(validation.errors).toMatchObject({
        supplierId: expect.stringContaining('Supplier'),
        'items.0.medicineId': expect.any(String),
        'items.0.batchNumber': expect.any(String),
        'items.0.quantity': expect.any(String),
        'items.0.purchasePrice': expect.any(String),
      });
      expect(validation.meta).toEqual({ context: 'purchase.create' });
    }
  });
});

