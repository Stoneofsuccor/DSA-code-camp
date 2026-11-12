export const mockPaymentGateway = {
  async charge(amountCents) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Magic number for testing a decline
    if (amountCents === 999) {
      return { success: false, reason: 'INSUFFICIENT_FUNDS' };
    }
    
    return { success: true, transactionId: crypto.randomUUID() };
  },
// In src/lib/mockPaymentGateway.js, add to the object:
  async refund(reference, amountCents) {
    await new Promise(resolve => setTimeout(resolve, 10));
    return { success: true, reference, amountCents };
  }
};
