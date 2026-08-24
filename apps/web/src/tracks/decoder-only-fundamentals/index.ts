import { createDecoderOnlyFundamentalsAdapter } from "./adapter";
import { decoderOnlyFundamentalsProfile } from "./profile";

export { decoderOnlyFundamentalsProfile } from "./profile";

export const decoderOnlyFundamentalsRegistration = {
  profile: decoderOnlyFundamentalsProfile,
  createAdapter: () =>
    createDecoderOnlyFundamentalsAdapter(decoderOnlyFundamentalsProfile),
};
