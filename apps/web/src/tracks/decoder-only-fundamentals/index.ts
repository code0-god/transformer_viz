import { createDecoderOnlyFundamentalsAdapter } from "./adapter";
import { decoderOnlyFundamentalsCourse } from "./course";
import { decoderOnlyFundamentalsProfile } from "./profile";

export {
  decoderGuideRuntimeAdapterIds,
  resolveDecoderRuntimeFacts,
  resolveDecoderSelectedOperation,
} from "./guideRuntime";
export { decoderOnlyFundamentalsProfile } from "./profile";

export const decoderOnlyFundamentalsRegistration = {
  profile: decoderOnlyFundamentalsProfile,
  course: decoderOnlyFundamentalsCourse,
  createAdapter: () =>
    createDecoderOnlyFundamentalsAdapter(decoderOnlyFundamentalsProfile),
};
