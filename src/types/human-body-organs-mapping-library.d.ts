declare module 'human-body-organs-mapping-library/src/SVGs/MaleSVG/index.js' {
  import type { FC } from 'react';

  interface MaleSVGProps {
    organsArray?: string[];
  }

  const MaleSVG: FC<MaleSVGProps>;
  export default MaleSVG;
}

declare module 'human-body-organs-mapping-library/src/SVGs/OrgansData/data.js' {
  import type { ReactNode } from 'react';

  export interface OrganPathData {
    id: string;
    path: ReactNode;
    color: string;
    opacity: string;
  }

  export const maleData: OrganPathData[];
}
