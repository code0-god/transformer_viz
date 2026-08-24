import { createDecoderOnlyFundamentalsAdapter } from "./adapter";
import { decoderOnlyFundamentalsProfile } from "./profile";

export {
  decoderGuideRuntimeAdapterIds,
  resolveDecoderRuntimeFacts,
  resolveDecoderSelectedOperation,
} from "./guideRuntime";
export { decoderOnlyFundamentalsProfile } from "./profile";

export const decoderOnlyFundamentalsRegistration = {
  profile: decoderOnlyFundamentalsProfile,
  createAdapter: () =>
    createDecoderOnlyFundamentalsAdapter(decoderOnlyFundamentalsProfile),
};
