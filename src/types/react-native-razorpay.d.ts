declare module "react-native-razorpay" {
  export interface RazorpayCheckoutOptions {
    key: string;
    amount: number;
    currency?: string;
    order_id: string;
    name?: string;
    description?: string;
    image?: string;
    prefill?: { email?: string; contact?: string; name?: string };
    theme?: { color?: string };
    [key: string]: unknown;
  }

  export interface RazorpaySuccessResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  export interface RazorpayErrorResponse {
    code?: number;
    description?: string;
    [key: string]: unknown;
  }

  export default class RazorpayCheckout {
    static open(
      options: RazorpayCheckoutOptions
    ): Promise<RazorpaySuccessResponse>;
    static onExternalWalletSelection(callback: (data: unknown) => void): void;
  }
}
