// Customer V2 proof screen (spec 080 §3 N-5).
//
// The saved proof PNG is the whole product here, so this component is a quiet Modern Studio frame
// around one Canvas: no catalog read, no template art, no font gate, no placeholder image, and no
// download / save / order / share / admin affordance. Existing `@denn/ui` tokens only — no new
// colour, font, icon, dependency or decorative motion.

import { Badge } from "@denn/ui";
import type { PreviewRenderPlan } from "@denn/render";
import { PreviewCanvasSurface } from "../canvas/PreviewCanvasSurface";
import type { PreviewImageBindings } from "../canvas/types";

export interface SpaceV2ProofViewProps {
  readonly plan: PreviewRenderPlan;
  readonly imageBindings: PreviewImageBindings;
}

export function SpaceV2ProofView({
  plan,
  imageBindings,
}: SpaceV2ProofViewProps): React.JSX.Element {
  return (
    <section
      className="denn-stack"
      aria-labelledby="space-v2-proof-title"
      data-testid="space-v2-proof-view"
    >
      <Badge>저장된 시안 · 열람 전용</Badge>
      <h2 id="space-v2-proof-title">내 공간 시안</h2>
      <p>저장된 액자 구성을 확인할 수 있습니다.</p>
      <PreviewCanvasSurface
        plan={plan}
        imageBindings={imageBindings}
        accessibleName="저장된 액자 시안"
      />
    </section>
  );
}
